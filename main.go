package main

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// getEnv retrieves an environment variable or returns a default value if not set
func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}

func main() {
    // Get configuration from environment variables with fallbacks
    evolutionAPIBaseURL := getEnv("EVOLUTION_API_URL", "http://localhost:8080")
    apiPort := getEnv("API_PORT", ":3030")
    apiKey := getEnv("EVOLUTION_API_KEY", "a176e0c64c")

    // Log configuration (excluding sensitive info in production)
    fmt.Printf("Starting server with API URL: %s on port %s\n", evolutionAPIBaseURL, apiPort)
    if apiKey == "" {
        fmt.Println("WARNING: No API key provided through EVOLUTION_API_KEY environment variable")
    }

    // Initialize a new gin engine, with default middleware (logger and recovery)
    router := gin.Default()

    // Configure CORS middleware
    // Allows all origins, methods, and headers.
    // You might want to restrict origins in production, e.g., cors.Config{ AllowOrigins: []string{"http://localhost:3000"}, ... }
    config := cors.DefaultConfig()
    config.AllowAllOrigins = true // Or specify your React app's origin
    config.AllowMethods = []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"}
    config.AllowHeaders = []string{"Origin", "Content-Length", "Content-Type", "Authorization"} // Add any other headers your frontend might send
    router.Use(cors.New(config))

    // Configure trusted proxies
    router.SetTrustedProxies([]string{"127.0.0.1", "::1"})

    // Proxy all requests to /api/* to Evolution API
    router.Any("/api/*path", func(c *gin.Context) {
        proxyRequest(c, evolutionAPIBaseURL, apiKey)
    })

    // Simple health check endpoint
    router.GET("/health", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{
            "status": "ok",
        })
    })

    // Start the server
    router.Run(apiPort)
}

// proxyRequest forwards the request to Evolution API
func proxyRequest(c *gin.Context, evolutionAPIBaseURL, apiKey string) {
    // Get the path that was requested
    // Context send the context around the request, we need to use it to get the path
    path := c.Param("path")

    // Build the target URL, parse the base evolutionURL and append the path received in the request
    targetURL, err := url.Parse(evolutionAPIBaseURL + path)

    // Check for errors
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse URL"})
        return
    }

    // Create a new request
    req, err := http.NewRequest(c.Request.Method, targetURL.String(), c.Request.Body)

    // Check for errors
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create request"})
        return
    }

    // Copy headers from the original request
    for name, values := range c.Request.Header {
        for _, value := range values {
            req.Header.Add(name, value)
        }
    }

    // Add API key to the request headers - try different common approaches
    // req.Header.Set("X-API-Key", apiKey)
    // req.Header.Set("Authorization", "Bearer "+apiKey)
    // req.Header.Set("Authorization", apiKey)  // Some APIs just need the key directly
    req.Header.Set("apikey", apiKey)

    // Set query parameters from original request
    query := req.URL.Query()
    for k, v := range c.Request.URL.Query() {
        for _, vv := range v {
            query.Add(k, vv)
        }
    }

    // Also add API key as a query parameter with different common names
    // query.Set("apiKey", apiKey)
    // query.Set("api_key", apiKey)
    // query.Set("key", apiKey)
    req.URL.RawQuery = query.Encode()

    // Log the outgoing request details for debugging
    fmt.Printf("Sending request to: %s\n", req.URL.String())
    fmt.Printf("Headers: %v\n", req.Header)

    // Send the request to the target server
    client := &http.Client{}
    resp, err := client.Do(req)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send request to target server", "details": err.Error()})
        return
    }
    defer resp.Body.Close()

    // Read the response body for logging, especially for 401 errors
    body, err := io.ReadAll(resp.Body)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read response body"})
        return
    }

    // If we got a 401, log the response for debugging
    if resp.StatusCode == 401 {
        fmt.Printf("Got 401 Unauthorized: %s\n", string(body))
    }

    // Copy the response headers
    for name, values := range resp.Header {
        for _, value := range values {
            c.Header(name, value)
        }
    }

    // Set the status code
    c.Status(resp.StatusCode)

    // Write the response body
    c.Writer.Write(body)
}