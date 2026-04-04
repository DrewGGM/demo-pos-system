import React, { createContext, useCallback, useState } from 'react';

interface WebSocketMessage {
  type: string;
  client_id?: string;
  timestamp: string;
  data: any;
}

interface WebSocketContextType {
  isConnected: boolean;
  sendMessage: (message: WebSocketMessage) => void;
  subscribe: (eventType: string, callback: (data: any) => void) => () => void;
  connect: () => void;
  disconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected] = useState(true);
  const sendMessage = useCallback((_message: WebSocketMessage) => {}, []);
  const subscribe = useCallback((_eventType: string, _callback: (data: any) => void) => () => {}, []);
  const connect = useCallback(() => {}, []);
  const disconnect = useCallback(() => {}, []);

  return (
    <WebSocketContext.Provider value={{ isConnected, sendMessage, subscribe, connect, disconnect }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocketContext = () => {
  const context = React.useContext(WebSocketContext);
  if (!context) throw new Error('useWebSocketContext must be used within WebSocketProvider');
  return context;
};

export { WebSocketContext };
export default WebSocketContext;
