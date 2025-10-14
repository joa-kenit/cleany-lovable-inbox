import { useState } from "react";
import { Hero } from "@/components/Hero";
import { EmailList } from "@/components/EmailList";

const Index = () => {
  const [isConnected, setIsConnected] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {!isConnected ? (
        <Hero onConnect={() => setIsConnected(true)} />
      ) : (
        <EmailList />
      )}
    </div>
  );
};

export default Index;
