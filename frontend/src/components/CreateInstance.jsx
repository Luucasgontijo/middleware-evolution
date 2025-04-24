import React, { useState } from "react";

const CreateInstance = ({ onSuccess, onCancel }) => {
  const [instanceNames, setInstanceNames] = useState([""]);
  const [token, setToken] = useState("");
  const [qrcode, setQrcode] = useState(true);
  const [number, setNumber] = useState("");
  const [integration, setIntegration] = useState("WHATSAPP-BAILEYS");
  const [webhook, setWebhook] = useState("");
  const [webhookByEvents, setWebhookByEvents] = useState(false);
  const [events, setEvents] = useState(["MESSAGES_UPSERT"]);
  const [rejectCall, setRejectCall] = useState(true);
  const [msgCall, setMsgCall] = useState("");
  const [groupsIgnore, setGroupsIgnore] = useState(true);
  const [alwaysOnline, setAlwaysOnline] = useState(true);
  const [readMessages, setReadMessages] = useState(true);
  const [readStatus, setReadStatus] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showOptionalSettings, setShowOptionalSettings] = useState(false);

  const availableEvents = [
    "MESSAGES_UPSERT",
    "APPLICATION_STARTUP",
    "QRCODE_UPDATED",
    "MESSAGES_SET",
    "MESSAGES_UPDATE",
    "MESSAGES_DELETE",
    "SEND_MESSAGE",
    "CONTACTS_SET",
    "CONTACTS_UPSERT",
    "CONTACTS_UPDATE",
    "PRESENCE_UPDATE",
    "CHATS_SET",
    "CHATS_UPSERT",
    "CHATS_UPDATE",
    "CHATS_DELETE",
    "GROUPS_UPSERT",
    "GROUP_UPDATE",
    "GROUP_PARTICIPANTS_UPDATE",
    "CONNECTION_UPDATE",
    "CALL",
    "NEW_JWT_TOKEN",
    "TYPEBOT_START",
    "TYPEBOT_CHANGE_STATUS",
  ];

  const addInstanceNameField = () => {
    setInstanceNames([...instanceNames, ""]);
  };

  const updateInstanceName = (index, value) => {
    const newNames = [...instanceNames];
    newNames[index] = value;
    setInstanceNames(newNames);
  };

  const removeInstanceName = (index) => {
    if (instanceNames.length <= 1) return;
    const newNames = instanceNames.filter((_, i) => i !== index);
    setInstanceNames(newNames);
  };

  const toggleOptionalSettings = () => {
    setShowOptionalSettings(!showOptionalSettings);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const invalidNames = instanceNames.filter((name) => !name.trim());
    if (invalidNames.length > 0) {
      setError("Todos os nomes de instância são obrigatórios");
      setIsLoading(false);
      return;
    }

    const uniqueNames = new Set(instanceNames);
    if (uniqueNames.size !== instanceNames.length) {
      setError("Existem nomes de instância duplicados");
      setIsLoading(false);
      return;
    }

    try {
      for (const name of instanceNames) {
        const instanceData = {
          instanceName: name,
          token: token || undefined,
          integration,
          // Apenas incluir webhook se estiver criando uma única instância
          webhook: instanceNames.length === 1 ? (webhook || undefined) : undefined,
          webhookByEvents: instanceNames.length === 1 ? webhookByEvents : false,
          events: instanceNames.length === 1 && webhookByEvents ? events : undefined,
          qrcode,
          number: number || undefined,
          rejectCall,
          msgCall: msgCall || undefined,
          groupsIgnore,
          alwaysOnline,
          readMessages,
          readStatus,
        };

        Object.keys(instanceData).forEach(
          (key) => instanceData[key] === undefined && delete instanceData[key]
        );

        await fetch("http://localhost:3030/api/instance/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(instanceData),
        });
      }

      onSuccess(instanceNames[instanceNames.length - 1]);
    } catch (error) {
      setError(`Erro ao criar instância: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const checkboxLabelClass =
    "flex items-center space-x-2 text-sm font-medium text-gray-700 cursor-pointer";
  const checkboxInputClass =
    "h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer";
  const inputStyle =
    "mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100 text-gray-700 disabled:bg-gray-100";
  const labelStyle = "block text-sm font-medium text-gray-700";

  return (
    <form onSubmit={handleSubmit} className="p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">
        Create New Instance
      </h2>

      <div className="space-y-4 mb-6">
        <label className="block text-gray-700 text-sm font-bold mb-2">
          Instance Names
        </label>

        {instanceNames.map((name, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => updateInstanceName(index, e.target.value)}
              placeholder="Nome da instância"
              className="w-full px-3 py-2 border rounded text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />

            {instanceNames.length > 1 && (
              <button
                type="button"
                onClick={() => removeInstanceName(index)}
                className="p-2 text-red-500 hover:text-red-700"
                title="Remover instância"
              >
                ✕
              </button>
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={addInstanceNameField}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
        >
          Adicionar instância
        </button>
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <label htmlFor="webhook" className={labelStyle}>
            Webhook URL
            {instanceNames.length > 1 && (
              <span className="ml-2 text-xs text-orange-500 font-normal">
                (Desabilitado para criação em lote)
              </span>
            )}
          </label>
          <input
            id="webhook"
            type="url"
            value={instanceNames.length > 1 ? "" : webhook}
            onChange={(e) => setWebhook(e.target.value)}
            className={`${inputStyle} ${
              instanceNames.length > 1 ? "bg-gray-100 cursor-not-allowed" : ""
            }`}
            placeholder="https://webhook-url.com"
            disabled={instanceNames.length > 1}
          />
          {instanceNames.length > 1 && (
            <p className="mt-1 text-sm text-gray-500">
              Configure webhooks individualmente após a criação das instâncias.
            </p>
          )}
        </div>
      </div>

      <div className="mb-6">
        <button
          type="button"
          onClick={toggleOptionalSettings}
          className="flex items-center justify-between w-full px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
        >
          <span className="font-medium">Optional Settings</span>
          <svg
            className={`w-5 h-5 transition-transform ${
              showOptionalSettings ? "transform rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {showOptionalSettings && (
          <div className="mt-4 p-4 border border-gray-200 rounded-md space-y-4 bg-gray-20">
            <div>
              <label htmlFor="integration" className={labelStyle}>
                Integration
              </label>
              <select
                id="integration"
                value={integration}
                onChange={(e) => setIntegration(e.target.value)}
                className={inputStyle}
              >
                <option value="WHATSAPP-BAILEYS">WHATSAPP-BAILEYS</option>
              </select>
            </div>

            <div className="flex items-center">
              <input
                id="webhookByEvents"
                type="checkbox"
                checked={webhookByEvents}
                onChange={(e) => setWebhookByEvents(e.target.checked)}
                className={checkboxInputClass}
              />
              <label htmlFor="webhookByEvents" className={checkboxLabelClass}>
                Enable Webhook by Events
              </label>
            </div>

            {webhookByEvents && (
              <div>
                <label className={labelStyle}>Events to monitor</label>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {availableEvents.map((eventName) => (
                    <div key={eventName} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`event-${eventName}`}
                        checked={events.includes(eventName)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEvents([...events, eventName]);
                          } else {
                            setEvents(events.filter((e) => e !== eventName));
                          }
                        }}
                        className={checkboxInputClass}
                      />
                      <label
                        htmlFor={`event-${eventName}`}
                        className={checkboxLabelClass}
                      >
                        {eventName}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="token" className={labelStyle}>
                  Token
                </label>
                <input
                  id="token"
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className={inputStyle}
                />
              </div>

              <div>
                <label htmlFor="number" className={labelStyle}>
                  Number
                </label>
                <input
                  id="number"
                  type="text"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  className={inputStyle}
                />
              </div>

              <div>
                <label htmlFor="msgCall" className={labelStyle}>
                  Call Message
                </label>
                <input
                  id="msgCall"
                  type="text"
                  value={msgCall}
                  onChange={(e) => setMsgCall(e.target.value)}
                  className={inputStyle}
                  placeholder="Sorry, I can't answer calls right now"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center">
                <input
                  id="qrcode"
                  type="checkbox"
                  checked={qrcode}
                  onChange={(e) => setQrcode(e.target.checked)}
                  className={checkboxInputClass}
                />
                <label htmlFor="qrcode" className={checkboxLabelClass}>
                  Show QR Code
                </label>
              </div>

              <div className="flex items-center">
                <input
                  id="rejectCall"
                  type="checkbox"
                  checked={rejectCall}
                  onChange={(e) => setRejectCall(e.target.checked)}
                  className={checkboxInputClass}
                />
                <label htmlFor="rejectCall" className={checkboxLabelClass}>
                  Reject Calls
                </label>
              </div>

              <div className="flex items-center">
                <input
                  id="groupsIgnore"
                  type="checkbox"
                  checked={groupsIgnore}
                  onChange={(e) => setGroupsIgnore(e.target.checked)}
                  className={checkboxInputClass}
                />
                <label htmlFor="groupsIgnore" className={checkboxLabelClass}>
                  Ignore Groups
                </label>
              </div>

              <div className="flex items-center">
                <input
                  id="alwaysOnline"
                  type="checkbox"
                  checked={alwaysOnline}
                  onChange={(e) => setAlwaysOnline(e.target.checked)}
                  className={checkboxInputClass}
                />
                <label htmlFor="alwaysOnline" className={checkboxLabelClass}>
                  Always Online
                </label>
              </div>

              <div className="flex items-center">
                <input
                  id="readMessages"
                  type="checkbox"
                  checked={readMessages}
                  onChange={(e) => setReadMessages(e.target.checked)}
                  className={checkboxInputClass}
                />
                <label htmlFor="readMessages" className={checkboxLabelClass}>
                  Read Messages
                </label>
              </div>

              <div className="flex items-center">
                <input
                  id="readStatus"
                  type="checkbox"
                  checked={readStatus}
                  onChange={(e) => setReadStatus(e.target.checked)}
                  className={checkboxInputClass}
                />
                <label htmlFor="readStatus" className={checkboxLabelClass}>
                  Read Status
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>
      )}

      <div className="flex justify-end gap-3 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded text-sm"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded text-sm"
        >
          {isLoading
            ? "Criando..."
            : `Criar ${instanceNames.length} instância(s)`}
        </button>
      </div>
    </form>
  );
};

export default CreateInstance;