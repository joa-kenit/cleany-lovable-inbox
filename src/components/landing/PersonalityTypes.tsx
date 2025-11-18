import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Zap, Heart, Shield, Brain } from "lucide-react";

const personalities = [
  {
    icon: Zap,
    title: "The Quick Responder",
    description: "Always on top of your inbox, you reply within minutes and keep things organized.",
    color: "from-yellow-400 to-orange-500",
    textColor: "text-orange-600"
  },
  {
    icon: Heart,
    title: "The Social Butterfly",
    description: "Your inbox is full of personal connections and meaningful conversations.",
    color: "from-pink-400 to-rose-500",
    textColor: "text-rose-600"
  },
  {
    icon: Shield,
    title: "The Minimalist",
    description: "You value a clean inbox and regularly archive or delete emails to maintain order.",
    color: "from-blue-400 to-indigo-500",
    textColor: "text-indigo-600"
  },
  {
    icon: Brain,
    title: "The Information Collector",
    description: "You keep everything for reference, building a personal knowledge base in your inbox.",
    color: "from-purple-400 to-pink-500",
    textColor: "text-purple-600"
  }
];

export function LandingPersonalityTypes() {
  return (
    <section className="px-6 py-20 lg:px-8 lg:py-32 bg-white">
      <div className="mx-auto max-w-7xl">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl lg:text-5xl font-bold tracking-tight text-gray-900 mb-4">
            Discover Your Inbox Personality
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Everyone has a unique way of managing emails. Find out which personality type matches your inbox habits.
          </p>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {personalities.map((personality, index) => {
            const Icon = personality.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                whileHover={{ y: -10 }}
              >
                <Card className="p-6 h-full hover:shadow-2xl transition-all duration-300 border-gray-200 bg-gradient-to-br from-white to-gray-50">
                  <motion.div 
                    className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${personality.color} flex items-center justify-center mb-4 shadow-lg`}
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                  >
                    <Icon className="w-8 h-8 text-white" />
                  </motion.div>
                  <h3 className={`text-xl font-semibold mb-3 ${personality.textColor}`}>
                    {personality.title}
                  </h3>
                  <p className="text-gray-600">{personality.description}</p>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
