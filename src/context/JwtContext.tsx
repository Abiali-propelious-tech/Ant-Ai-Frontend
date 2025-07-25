"use client";
import React, { createContext, useContext, useState } from "react";

interface JwtContextType {
  jwt: string | null;
  setJwt: (token: string | null) => void;
}

const JwtContext = createContext<JwtContextType | undefined>(undefined);

export const JwtProvider = ({ children }: { children: React.ReactNode }) => {
  const [jwt, setJwt] = useState<string | null>(null);
  return (
    <JwtContext.Provider value={{ jwt, setJwt }}>
      {children}
    </JwtContext.Provider>
  );
};

export const useJwt = () => {
  const context = useContext(JwtContext);
  if (!context) throw new Error("useJwt must be used within JwtProvider");
  return context;
};
