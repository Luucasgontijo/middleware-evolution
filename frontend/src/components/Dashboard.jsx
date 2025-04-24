import React, { useState, useEffect, useCallback } from "react";
import CreateInstance from "./CreateInstance";
import "../index.css";
// import logoImage from "../assets/image.png"; 
import { MdToggleOff, MdToggleOn, MdEdit, MdAdd } from "react-icons/md";




// Connection state indicator component
const ConnectionStateIndicator = ({ state }) => {
  const stateMap = {
    "open": ["green", "Connected"],
    "connected": ["green", "Connected"],
    "online": ["green", "Connected"],
    "connecting": ["yellow", "Connecting"],
    "loading": ["yellow", "Connecting"],
    "disconnected": ["red", "Disconnected"],
    "closed": ["red", "Disconnected"],
    "offline": ["red", "Disconnected"],
    "error": ["red", "Error"]
  };
  
  const [color, label] = stateMap[state?.toLowerCase()] || ["gray", state || "Unknown"];
  
  // Use a switch statement to return the appropriate component with static classes
  switch(color) {
    case "green":
      return (
        <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
          <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1"></span>
          {label}
        </span>
      );
    case "yellow":
      return (
        <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
          <span className="inline-block w-2 h-2 rounded-full bg-yellow-500 mr-1"></span>
          {label}
        </span>
      );
    case "red":
      return (
        <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-800">
          <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1"></span>
          {label}
        </span>
      );
    default:
      return (
        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-800">
          <span className="inline-block w-2 h-2 rounded-full bg-gray-500 mr-1"></span>
          {label}
        </span>
      );
  }
};

// Modal component for reuse
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="relative p-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">{title}</h2>
          {children}
        </div>
      </div>
    </div>
  );
};

// Toast notification component
const Toast = ({ message, type = "info", onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [onClose]);
  
  const bgColor = {
    success: "bg-green-500",
    error: "bg-red-500",
    info: "bg-blue-500",
    warning: "bg-yellow-500"
  }[type] || "bg-gray-700";
  
  return (
    <div className={`p-3 ${bgColor} text-white rounded-md shadow-lg flex items-center justify-between`}>
      <span>{message}</span>
      <button 
        onClick={onClose} 
        className="ml-3 text-white hover:text-gray-200"
      >
        ✕
      </button>
    </div>
  );
};

// API utility functions
const api = {
  baseUrl: "http://localhost:3030/api",
  
  async fetch(endpoint, options = {}) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, options);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.message || `HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`API Error: ${endpoint}`, error);
      throw error;
    }
  },
  
  getInstances: () => api.fetch("/instance/fetchInstances"),
  getQrCode: (name) => api.fetch(`/instance/connect/${encodeURIComponent(name)}`),
  resetConnection: (name) => api.fetch(`/instance/restart/${encodeURIComponent(name)}`, { method: "PUT" }),
  deleteInstance: (name) => api.fetch(`/instance/delete/${encodeURIComponent(name)}`, { method: "DELETE" }),
  getWebhook: (name) => api.fetch(`/webhook/find/${encodeURIComponent(name)}`),
  setWebhook: (name, webhookData) => api.fetch(`/webhook/set/${encodeURIComponent(name)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ webhook: webhookData })
  }),
  getConnectionState: (name) => api.fetch(`/instance/connectionState/${encodeURIComponent(name)}`),
};

export default function Dashboard() {
  // Consolidated state
  const [state, setState] = useState({
    instances: [],
    filteredInstances: [],
    isLoading: true,
    error: null,
    searchQuery: "",
    selectedInstances: [],
    bulkActionInProgress: false,
    connectionStates: {},
    webhookUrls: {},
    webhookEnabled: {}, // Add this new state property
    resetStates: {},
    modals: {
      createForm: false,
      qrCode: { isOpen: false, instance: null, data: null, error: null, loading: false },
      deleteConfirmation: { isOpen: false, text: "", error: "" },
      webhook: { editing: null, newUrl: "", error: "", success: "" }
    },
    messages: { reset: "", webhook: "" },
    toasts: [] // Add this for toast notifications
  });

  // State updater helper
  const updateState = (updates) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  // Modal updater helper
  const updateModal = (modalName, updates) => {
    setState(prev => ({
      ...prev,
      modals: {
        ...prev.modals,
        [modalName]: {
          ...prev.modals[modalName],
          ...updates
        }
      }
    }));
  };

  // Add these helper functions after updateModal
  const addToast = (message, type = "info") => {
    const id = Date.now();
    updateState({ 
      toasts: [...state.toasts, { id, message, type }] 
    });
    return id;
  };

  const removeToast = (id) => {
    updateState({
      toasts: state.toasts.filter(toast => toast.id !== id)
    });
  };

  // Fetch instances
  const fetchInstances = useCallback(async () => {
    updateState({ isLoading: true, error: null });
    try {
      const data = await api.getInstances();
      const instances = Array.isArray(data) ? data : [];
      updateState({ 
        instances, 
        filteredInstances: instances.filter(instance => 
          (instance.name || "").toLowerCase().includes(state.searchQuery.toLowerCase())
        )
      });
    } catch (err) {
      updateState({ error: err.message, instances: [], filteredInstances: [] });
    } finally {
      updateState({ isLoading: false });
    }
  }, [state.searchQuery]);

  // Fetch QR code
  const fetchQrCode = async (instanceName) => {
    updateModal("qrCode", { isOpen: true, instance: instanceName, loading: true, error: null });
    try {
      const data = await api.getQrCode(instanceName);
      const qrCodeValue = data.qrcode?.base64 || data.qrcode?.image || data.qrcode?.code || data.base64 || data.image || data;
      
      if (!qrCodeValue) {
        throw new Error("QR code not found in response. The instance might be already connected.");
      }
      
      updateModal("qrCode", { data: qrCodeValue, loading: false });
    } catch (err) {
      updateModal("qrCode", { error: err.message, data: null, loading: false });
    }
  };

  const resetConnection = async (instanceName) => {
    try {
      // Show loading state
      updateState({ 
        resetStates: { ...state.resetStates, [instanceName]: 'loading' }
      });
      
      // Call API with proper error handling
      const response = await api.resetConnection(instanceName);
      console.log(`Reset response for ${instanceName}:`, response);
      
      // Handle success
      updateState({ 
        resetStates: { ...state.resetStates, [instanceName]: 'success' }
      });
      addToast(`Instance ${instanceName} reset successfully.`, "success");

      // Refresh connection states after reset
      fetchConnectionStates();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        updateState({ 
          resetStates: { ...state.resetStates, [instanceName]: null },
          messages: { ...state.messages, reset: '' }
        });
      }, 3000);
      
      return true; // Signal success to bulkResetConnections
    } catch (error) {
      console.error(`Error resetting ${instanceName}:`, error);
      
      // Handle error
      updateState({ 
        resetStates: { ...state.resetStates, [instanceName]: 'error' },
        messages: { ...state.messages, reset: `Error resetting ${instanceName}: ${error.message}` }
      });
      
      // Clear error message after 3 seconds
      setTimeout(() => {
        updateState({ 
          resetStates: { ...state.resetStates, [instanceName]: null },
          messages: { ...state.messages, reset: '' }
        });
      }, 3000);
      
      return false; // Signal failure to bulkResetConnections
    }
  };

  // Bulk actions
  const bulkResetConnections = async () => {
    if (state.selectedInstances.length === 0) return;
    
    updateState({ bulkActionInProgress: true, messages: { ...state.messages, reset: "" } });
    
    try {
      let successCount = 0, failCount = 0;
      
      for (const instanceName of state.selectedInstances) {
        const result = await resetConnection(instanceName);
        if (result) {
          successCount++;
        } else {
          failCount++;
        }
      }
      
      updateState({ 
        messages: { ...state.messages, reset: `Reset complete: ${successCount} successful, ${failCount} failed` },
        selectedInstances: []
      });
      fetchInstances();
    } catch (err) {
      updateState({ messages: { ...state.messages, reset: `Error during bulk operation: ${err.message}` } });
    } finally {
      updateState({ bulkActionInProgress: false });
    }
  };

  const confirmBulkDeletion = async () => {
    const expectedText = `eu quero deletar ${state.selectedInstances.length} instancias`;
    
    if (state.modals.deleteConfirmation.text.toLowerCase() !== expectedText.toLowerCase()) {
      updateModal("deleteConfirmation", { error: `Por favor digite exatamente: "${expectedText}"` });
      return;
    }
    
    updateModal("deleteConfirmation", { isOpen: false });
    updateState({ bulkActionInProgress: true, messages: { ...state.messages, reset: "" } });
    
    try {
      let successCount = 0, failCount = 0;
      let deletedInstanceNames = [];
      
      for (const instanceName of state.selectedInstances) {
        try {
          await api.deleteInstance(instanceName);
          successCount++;
          deletedInstanceNames.push(instanceName);
        } catch {
          failCount++;
        }
      }
      
      updateState({
        messages: { ...state.messages, reset: `Delete complete: ${successCount} successful, ${failCount} failed` },
        instances: state.instances.filter(instance => !deletedInstanceNames.includes(instance.name)),
        filteredInstances: state.filteredInstances.filter(instance => !deletedInstanceNames.includes(instance.name)),
        selectedInstances: []
      });
      
      // Add toast notifications based on deletion results
      if (successCount > 0) {
        addToast(`${successCount} instance${successCount > 1 ? 's' : ''} deleted successfully.`, "success");
      }
      if (failCount > 0) {
        addToast(`Failed to delete ${failCount} instance${failCount > 1 ? 's' : ''}.`, "error");
      }
      
      setTimeout(fetchInstances, 500);
    } catch (err) {
      updateState({ messages: { ...state.messages, reset: `Error during bulk operation: ${err.message}` } });
      addToast(`Error during deletion: ${err.message}`, "error");
    } finally {
      updateState({ bulkActionInProgress: false });
    }
  };

  // Webhook management
  const fetchWebhookUrls = useCallback(async () => {
    if (state.instances.length === 0) return;
    
    try {
      const promises = state.instances.map(async (instance) => {
        try {
          const data = await api.getWebhook(instance.name);
          const webhook = data.webhook || data.settings?.webhook || "";
          const enabled = 
            data.enabled !== undefined ? data.enabled : 
            data.settings?.enabled !== undefined ? data.settings.enabled :
            webhook ? true : false; // Default to true if webhook exists
            
          return { 
            urls: { [instance.name]: webhook || data.url || "" },
            enabled: { [instance.name]: enabled }
          };
        } catch {
          return { 
            urls: { [instance.name]: "" },
            enabled: { [instance.name]: false }
          };
        }
      });
      
      const results = await Promise.all(promises);
      
      const webhookMap = results.reduce((acc, item) => ({ ...acc, ...item.urls }), {});
      const enabledMap = results.reduce((acc, item) => ({ ...acc, ...item.enabled }), {});
      
      updateState({ 
        webhookUrls: webhookMap,
        webhookEnabled: enabledMap
      });
    } catch (error) {
      console.error("Error fetching webhook URLs:", error);
    }
  }, [state.instances]);

  const updateWebhook = async (instanceName) => {
    try {
      updateState({ modals: { ...state.modals, webhook: { ...state.modals.webhook, error: "", success: "" } } });
      
      if (state.modals.webhook.newUrl && !state.modals.webhook.newUrl.startsWith("http")) {
        updateState({ modals: { ...state.modals, webhook: { ...state.modals.webhook, error: "URL inválida. Deve começar com http:// ou https://" } } });
        return;
      }
      
      await api.setWebhook(instanceName, {
        url: state.modals.webhook.newUrl,
        events: ["MESSAGES_UPSERT"],
        webhook_base64: false,
        webhook_by_events: false,
        enabled: true
      });
      
      updateState({
        webhookUrls: { ...state.webhookUrls, [instanceName]: state.modals.webhook.newUrl },
        modals: { 
          ...state.modals, 
          webhook: { ...state.modals.webhook, editing: null, newUrl: "", success: `Webhook para ${instanceName} atualizado com sucesso!` }
        }
      });
      
      setTimeout(() => {
        updateState({ modals: { ...state.modals, webhook: { ...state.modals.webhook, success: "" } } });
      }, 3000);
    } catch (error) {
      updateState({ modals: { ...state.modals, webhook: { ...state.modals.webhook, error: `Erro ao atualizar webhook: ${error.message}` } } });
    }
  };

  const removeWebhook = async (instanceName) => {
    try {
      updateState({ modals: { ...state.modals, webhook: { ...state.modals.webhook, error: "", success: "" } } });
      
      await api.setWebhook(instanceName, {
        url: "",
        events: ["MESSAGES_UPSERT"],
        webhook_base64: false,
        webhook_by_events: false,
        enabled: false
      });
      
      updateState({
        webhookUrls: { ...state.webhookUrls, [instanceName]: "" },
        modals: { 
          ...state.modals, 
          webhook: { ...state.modals.webhook, success: `Webhook para ${instanceName} removido com sucesso!` }
        }
      });
      
      setTimeout(() => {
        updateState({ modals: { ...state.modals, webhook: { ...state.modals.webhook, success: "" } } });
      }, 3000);
    } catch (error) {
      updateState({ modals: { ...state.modals, webhook: { ...state.modals.webhook, error: `Erro ao remover webhook: ${error.message}` } } });
    }
  };

  const toggleWebhookStatus = async (instanceName, enabled) => {
    try {
      updateState({ modals: { ...state.modals, webhook: { ...state.modals.webhook, error: "", success: "" } } });
      
      // Get the current URL
      const currentUrl = state.webhookUrls[instanceName] || "";
      
      // Call the webhook/set endpoint with the same URL but toggled enabled state
      await api.setWebhook(instanceName, {
        url: currentUrl,
        events: ["MESSAGES_UPSERT"],
        webhook_base64: false,
        webhook_by_events: false,
        enabled: enabled
      });
      
      // Update the local state
      updateState({
        webhookEnabled: { ...state.webhookEnabled, [instanceName]: enabled }
      });
      addToast(`Webhook for ${instanceName} ${enabled ? 'enabled' : 'disabled'} successfully!`, "success");

      // Clear the message after 3 seconds
      setTimeout(() => {
        updateState({ messages: { ...state.messages, webhook: '' } });
      }, 3000);
    } catch (error) {
      console.error(`Error toggling webhook for ${instanceName}:`, error);
      updateState({ 
        messages: { 
          ...state.messages, 
          webhook: `Error ${enabled ? 'enabling' : 'disabling'} webhook: ${error.message}` 
        }
      });
      
      // Clear error message after 3 seconds
      setTimeout(() => {
        updateState({ messages: { ...state.messages, webhook: '' } });
      }, 3000);
    }
  };

  // Connection state management
  const fetchConnectionStates = useCallback(async () => {
    if (state.instances.length === 0) return;
    
    try {
      const promises = state.instances.map(async (instance) => {
        try {
          const data = await api.getConnectionState(instance.name);
          console.log(`Response for ${instance.name}:`, data);
          
          // Check for the nested instance.state structure first
          const connectionState = 
            (data.instance && data.instance.state) || 
            data.state || 
            data.status || 
            data.connection ||
            data.connectionState || 
            (data.response && data.response.state) ||
            "unknown";
            
          return { [instance.name]: connectionState };
        } catch (error) {
          console.error(`Error for ${instance.name}:`, error);
          return { [instance.name]: "error" };
        }
      });
      
      const results = await Promise.all(promises);
      const statesMap = results.reduce((acc, item) => ({ ...acc, ...item }), {});
      updateState({ connectionStates: statesMap });
    } catch (error) {
      console.error("Error fetching connection states:", error);
    }
  }, [state.instances]);

  // Effects
  useEffect(() => {
    fetchInstances();
  }, [fetchInstances]);

  useEffect(() => {
    if (state.instances.length > 0) {
      fetchWebhookUrls();
      fetchConnectionStates();
      
      const intervalId = setInterval(fetchConnectionStates, 30000);
      return () => clearInterval(intervalId);
    }
  }, [state.instances, fetchWebhookUrls, fetchConnectionStates]);

  useEffect(() => {
    updateState({
      filteredInstances: state.instances.filter(instance => 
        (instance.name || "").toLowerCase().includes(state.searchQuery.toLowerCase())
      )
    });
  }, [state.searchQuery, state.instances]);

  // Event handlers
  const handleCreateSuccess = (createdInstanceName) => {
    updateModal("createForm", { isOpen: false });
    fetchInstances();
  };

  const toggleInstanceSelection = (instanceName, event) => {
    // If Ctrl/Cmd key is pressed, toggle just this instance
    if (event && (event.ctrlKey || event.metaKey)) {
      updateState({
        selectedInstances: state.selectedInstances.includes(instanceName)
          ? state.selectedInstances.filter(name => name !== instanceName)
          : [...state.selectedInstances, instanceName]
      });
    } else {
      // Without Ctrl/Cmd key, select only this instance (clear others)
      updateState({
        selectedInstances: state.selectedInstances.includes(instanceName) && state.selectedInstances.length === 1
          ? [] // Deselect if it's the only one selected
          : [instanceName] // Otherwise, select only this one
      });
    }
  };

  // Add a new function to delete a single instance
  const deleteInstance = async (instanceName) => {
    try {
      updateState({ isLoading: true });
      await api.deleteInstance(instanceName);
      
      // Update instances list after deletion
      updateState({
        instances: state.instances.filter(instance => instance.name !== instanceName),
        filteredInstances: state.filteredInstances.filter(instance => instance.name !== instanceName)
      });
      
      addToast(`Instance ${instanceName} deleted successfully.`, "success");
      
      // Refresh the instances list
      setTimeout(fetchInstances, 500);
    } catch (error) {
      console.error(`Error deleting instance ${instanceName}:`, error);
      addToast(`Failed to delete instance ${instanceName}: ${error.message}`, "error");
    } finally {
      updateState({ isLoading: false });
    }
  };

  // Render UI
  return (
    <div className="min-h-screen w-full bg-[#0e0e10] text-white">
      <div className="p-4">
        {/* <img src={logoImage} alt="" className="mx-auto w-35" /> */}

        {/* Bulk actions */}
        {state.filteredInstances.length > 0 && (
          <div className="mb-4 p-2 bg-[#1a1a1c] border-none  text-center rounded flex flex-wrap items-center gap-2">
            {/* Add Connection State Filters */}
            <div className="flex flex-wrap gap-2 mr-auto ">
              <span className="text-sm text-white self-center">
                Select by state:
              </span>
              <button
                onClick={() => {
                  const connectedInstances = state.filteredInstances
                    .filter((instance) =>
                      ["connected", "open", "online"].includes(
                        (
                          state.connectionStates[instance.name] || ""
                        ).toLowerCase()
                      )
                    )
                    .map((instance) => instance.name);
                  updateState({ selectedInstances: connectedInstances });
                }}
                className="cursor-pointer text-xs px-2 py-1 rounded-full bg-green-100 text-green-800"
              >
                <span class="inline-block w-2 h-2 rounded-full bg-green-500 mr-1"></span>
                Connected
              </button>
              <button
                onClick={() => {
                  const connectingInstances = state.filteredInstances
                    .filter((instance) =>
                      ["connecting", "loading"].includes(
                        (
                          state.connectionStates[instance.name] || ""
                        ).toLowerCase()
                      )
                    )
                    .map((instance) => instance.name);
                  updateState({ selectedInstances: connectingInstances });
                }}
                className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800"
              >
                <span class="inline-block w-2 h-2 rounded-full bg-yellow-500 mr-1"></span>
                Connecting
              </button>

              <button
                onClick={() => {
                  const unknownInstances = state.filteredInstances
                    .filter(
                      (instance) =>
                        !state.connectionStates[instance.name] ||
                        state.connectionStates[instance.name] === "close"
                    )
                    .map((instance) => instance.name);
                  updateState({ selectedInstances: unknownInstances });
                }}
                className="cursor-pointer text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-800"
              >
                <span class="inline-block w-2 h-2 rounded-full bg-gray-500 mr-1"></span>
                
                Disconnected
              </button>
            </div>

            <div className="flex gap-2">
              <span className="text-sm text-white self-center">
                {state.selectedInstances.length} selected
              </span>

              <button
                onClick={() =>
                  updateModal("deleteConfirmation", {
                    isOpen: true,
                    text: "",
                    error: "",
                  })
                }
                disabled={
                  state.selectedInstances.length === 0 ||
                  state.bulkActionInProgress
                }
                className={`px-3 py-1 rounded text-sm ${
                  state.selectedInstances.length === 0 ||
                  state.bulkActionInProgress
                    ? "bg-red-500 text-white cursor-not-allowed"
                    : "bg-red-500 text-white hover:bg-red-600"
                }`}
              >
                Delete Selected
              </button>

              {state.bulkActionInProgress && (
                <span className="text-sm text-gray-700 self-center">
                  Working...
                </span>
              )}
            </div>
          </div>
        )}
        {/* Search and create section */}
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center mb-4 justify-center w-full">
          <button
            onClick={() => updateModal("createForm", { isOpen: true })}
            className="
            cursor-pointer
            px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Create New Instance
          </button>

          <div className="relative w-64 sm:w-80 md:w-96">
            <input
              type="text"
              placeholder="Search instances..."
              value={state.searchQuery}
              onChange={(e) => updateState({ searchQuery: e.target.value })}
              className="
              bg-white
              w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-300 text-black"
            />
            {state.searchQuery && (
              <button
                onClick={() => updateState({ searchQuery: "" })}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>
        {/* 100: "#0e0e10", //main background
          200: "#1a1a1c", //sidebar
          300: "#9E9E9E", //text
          400: "#FFFFFF", // hover/ */}

        {/* Instances list */}
        {!state.isLoading && !state.error && (
          <div>
            <h2>Instances</h2>
            {state.filteredInstances.length > 0 ? (
              <ul className="list-disc pl-5 space-y-2">
                {state.filteredInstances.map((instance) => (
                  <li
                    key={instance.name || instance.id}
                    className="p-2 bg-[#1a1a1c] border- list-none rounded flex flex-col"
                    onClick={(e) => toggleInstanceSelection(instance.name, e)}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="flex items-center w-full">
                      <input
                        type="checkbox"
                        checked={state.selectedInstances.includes(
                          instance.name
                        )}
                        onChange={(e) => {
                          // Stop propagation to prevent double-toggle from the li click handler
                          e.stopPropagation();
                          toggleInstanceSelection(instance.name, e);
                        }}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-3"
                      />
                      <span className="flex-grow font-medium">
                        {instance.name}
                        <span className="ml-2 inline-flex items-center">
                          <ConnectionStateIndicator
                            state={
                              state.connectionStates[instance.name] || "unknown"
                            }
                          />
                        </span>
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // Stop event from bubbling up
                            fetchQrCode(instance.name);
                          }}
                          disabled={["connected", "open", "online"].includes(
                            (
                              state.connectionStates[instance.name] || ""
                            ).toLowerCase()
                          )}
                          title={
                            ["connected", "open", "online"].includes(
                              (
                                state.connectionStates[instance.name] || ""
                              ).toLowerCase()
                            )
                              ? "Instance is already connected. QR code is not needed."
                              : "Get QR code to connect this instance"
                          }
                          className={`px-3 py-1 rounded text-sm ${
                            ["connected", "open", "online"].includes(
                              (
                                state.connectionStates[instance.name] || ""
                              ).toLowerCase()
                            )
                              ? "bg-gray-300 text-gray-500 cursor-not-allowed opacity-60"
                              : "bg-white text-black hover:opacity-80 cursor-pointer"
                          }`}
                        >
                          QR Code
                        </button>
                        {/* Replace reset button with delete button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // Stop event from bubbling up
                            deleteInstance(instance.name);
                          }}
                          className="px-3 py-1 bg-red-500 text-white rounded cursor-pointer hover:opacity-80 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* Webhook URL section */}
                    <div className="mt-2 pl-7 flex items-center">
                      <span className="text-gray-500 text-sm mr-2">
                        Webhook:
                      </span>
                      {state.modals.webhook.editing === instance.name ? (
                        <div className="flex-grow flex items-center gap-2">
                          <input
                            type="text"
                            value={state.modals.webhook.newUrl}
                            onChange={(e) =>
                              updateState({
                                modals: {
                                  ...state.modals,
                                  webhook: {
                                    ...state.modals.webhook,
                                    newUrl: e.target.value,
                                  },
                                },
                              })
                            }
                            placeholder="https://seu-webhook.com/endpoint"
                            className="w-1/2 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-300"
                          />
                          <button
                            onClick={() => updateWebhook(instance.name)}
                            className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                          >
                            Salvar
                          </button>
                          <button
                            onClick={() =>
                              updateState({
                                modals: {
                                  ...state.modals,
                                  webhook: {
                                    ...state.modals.webhook,
                                    editing: null,
                                    newUrl: "",
                                    error: "",
                                  },
                                },
                              })
                            }
                            className="px-2 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <div className="flex-grow flex items-center">
                          <span className="text-sm text-gray-700 truncate max-w-[300px] mr-2">
                            {state.webhookUrls[instance.name] ||
                              "Não configurado"}
                          </span>
                          {state.webhookUrls[instance.name] ? (
                            <>
                              {/* Add toggle button for webhook enabled state */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Toggle webhook enabled status
                                  const currentStatus =
                                    state.webhookEnabled?.[instance.name] !==
                                    false; // Default to true if undefined
                                  toggleWebhookStatus(
                                    instance.name,
                                    !currentStatus
                                  );
                                }}
                                className={`p-1 ${
                                  state.webhookEnabled?.[instance.name] !==
                                  false
                                    ? "text-green-500 hover:text-green-700"
                                    : "text-gray-400 hover:text-gray-600"
                                } mr-1`}
                                title={
                                  state.webhookEnabled?.[instance.name] !==
                                  false
                                    ? "Webhook ativo (clique para desativar)"
                                    : "Webhook inativo (clique para ativar)"
                                }
                              >
                                {state.webhookEnabled?.[instance.name] !==
                                false ? (
                                  <MdToggleOn />
                                ) : (
                                  <MdToggleOff />
                                )}
                              </button>
                              <button
                                onClick={() =>
                                  updateState({
                                    modals: {
                                      ...state.modals,
                                      webhook: {
                                        ...state.modals.webhook,
                                        editing: instance.name,
                                        newUrl:
                                          state.webhookUrls[instance.name] ||
                                          "",
                                        error: "",
                                      },
                                    },
                                  })
                                }
                                className="p-1 text-blue-500 hover:text-blue-700 mr-1"
                                title="Editar webhook"
                              >
                                <MdEdit size={18} />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() =>
                                updateState({
                                  modals: {
                                    ...state.modals,
                                    webhook: {
                                      ...state.modals.webhook,
                                      editing: instance.name,
                                      newUrl: "",
                                      error: "",
                                    },
                                  },
                                })
                              }
                              className="p-1 text-blue-500 hover:text-blue-700"
                              title="Configurar webhook"
                            >
                              <MdAdd size={18} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p>
                {state.searchQuery
                  ? "No matching instances found."
                  : "No instances found."}
              </p>
            )}
          </div>
        )}

        {/* QR Code Modal */}
        <Modal
          isOpen={state.modals.qrCode.isOpen}
          onClose={() =>
            updateModal("qrCode", {
              isOpen: false,
              instance: null,
              data: null,
              error: null,
            })
          }
          title={`QR Code for ${state.modals.qrCode.instance}`}
        >
          {state.modals.qrCode.loading && (
            <div className="text-center py-8">
              <p>Loading QR code...</p>
            </div>
          )}

          {state.modals.qrCode.error && (
            <div className="text-center py-4 px-6 bg-red-100 text-red-700 rounded-md">
              <p>Error loading QR code: {state.modals.qrCode.error}</p>
              <div className="mt-4 flex justify-center space-x-3">
                <button
                  onClick={() => fetchQrCode(state.modals.qrCode.instance)}
                  className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                >
                  Retry
                </button>
                <button
                  onClick={() => resetConnection(state.modals.qrCode.instance)}
                  className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                >
                  Reset Connection
                </button>
              </div>
            </div>
          )}

          {state.modals.qrCode.data && !state.modals.qrCode.loading && (
            <div className="flex justify-center">
              {typeof state.modals.qrCode.data === "string" ? (
                <img
                  src={
                    state.modals.qrCode.data.startsWith("data:image")
                      ? state.modals.qrCode.data
                      : `data:image/png;base64,${state.modals.qrCode.data}`
                  }
                  alt={`QR Code for ${state.modals.qrCode.instance}`}
                  className="max-w-full"
                />
              ) : (
                <pre className="bg-gray-100 p-4 rounded overflow-auto max-w-full">
                  {JSON.stringify(state.modals.qrCode.data, null, 2)}
                </pre>
              )}
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm">
              Scan this QR code with WhatsApp to connect to the instance.
            </p>
          </div>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={state.modals.deleteConfirmation.isOpen}
          onClose={() => updateModal("deleteConfirmation", { isOpen: false })}
          title="Confirm Deletion"
        >
          <p className="mb-4 text-red-600">
            Você está prestes a deletar{" "}
            <strong>{state.selectedInstances.length}</strong> instâncias. Esta
            ação não pode ser desfeita.
          </p>

          <p className="mb-2 text-gray-700">
            Para confirmar, digite exatamente:
          </p>

          <p className="p-2 bg-black border border-gray-300 rounded mb-4 font-mono text-sm">
            eu quero deletar {state.selectedInstances.length} instancias
          </p>

          <div className="mb-4">
            <input
              type="text"
              value={state.modals.deleteConfirmation.text}
              onChange={(e) =>
                updateModal("deleteConfirmation", { text: e.target.value })
              }
              className="w-full px-4 py-2 border rounded focus:outline-none text-black focus:ring-2 focus:ring-red-300"
              placeholder="Digite o texto de confirmação..."
              autoFocus
            />
          </div>

          {state.modals.deleteConfirmation.error && (
            <div className="mb-4 p-2 bg-red-100 text-red-700 rounded-md text-sm">
              {state.modals.deleteConfirmation.error}
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              onClick={() =>
                updateModal("deleteConfirmation", { isOpen: false })
              }
              className="px-4 py-2 border border-gray-300 rounded shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={confirmBulkDeletion}
              className="px-4 py-2 border border-transparent rounded shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
            >
              Deletar
            </button>
          </div>
        </Modal>

        {/* Create Instance Modal */}
        {state.modals.createForm.isOpen && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="relative">
                <button
                  onClick={() => updateModal("createForm", { isOpen: false })}
                  className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
                <CreateInstance
                  onSuccess={handleCreateSuccess}
                  onCancel={() => updateModal("createForm", { isOpen: false })}
                />
              </div>
            </div>
          </div>
        )}

        {/* Toast notification container */}
        <div className="fixed bottom-4 right-4 space-y-2 z-50">
          {state.toasts.map((toast) => (
            <Toast
              key={toast.id}
              message={toast.message}
              type={toast.type}
              onClose={() => removeToast(toast.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}