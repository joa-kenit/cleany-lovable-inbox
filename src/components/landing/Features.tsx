import { Trash2, FolderTree, Zap, Shield, TrendingUp, Brain } from "lucide-react";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";

const features = [
  {
    icon: FolderTree,
    title: "Group by Sender",
    description: "Emails are automatically grouped by sender, making it easy to see who's filling up your inbox.",
    color: "text-rose-700"
  },
  {
    icon: Zap,
    title: "Bulk Actions",
    description: "Delete thousands of emails in seconds. Select entire groups and clean up your inbox with one click.",
    color: "text-orange-600"
  },
  {
    icon: Trash2,
    title: "Free Up Space",
    description: "Reclaim valuable storage space by identifying and removing large emails and attachments.",
    color: "text-rose-800"
  },
  {
    icon: Shield,
    title: "Privacy First",
    description: "Your emails stay yours. We never keep your email content or sell your data. Read the full Privacy Policy",
    color: "text-amber-700"
  },
  {
    icon: Brain,
    title: "Inbox Personality",
    description: "Discover your unique inbox personality and get insights into your email habits and preferences.",
    color: "text-rose-900"
  },
  {
    icon: TrendingUp,
    title: "Gmail Compatible",
    description: "Seamlessly connects with your Google account. Works with Gmail and Google Workspace.",
    color: "text-orange-700"
  }
];

export function LandingFeatures() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5
      }
    }
  };

  return (
    <section className="px-6 py-20 lg:px-8 lg:py-32 bg-white relative">
      {/* Decorative top wave */}
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-amber-50 to-transparent"></div>
      
      <div className="mx-auto max-w-7xl">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl lg:text-5xl tracking-tight text-gray-900 mb-4">
            Everything you need to master your inbox
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Powerful features designed to help you take control of your email and understand yourself better.
          </p>
        </motion.div>

        <motion.div 
          className="grid gap-8 md:grid-cols-2 lg:grid-cols-3"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div 
                key={index} 
                variants={itemVariants}
                whileHover={{ y: -8, transition: { duration: 0.3 } }}
              >
                <Card className="p-6 hover:shadow-2xl transition-all duration-300 border-gray-200 h-full bg-gradient-to-br from-white to-orange-50/30 hover:border-rose-200">
                  <motion.div 
                    className={`w-12 h-12 rounded-lg bg-gradient-to-br from-rose-100 to-orange-100 flex items-center justify-center mb-4 ${feature.color}`}
                    whileHover={{ rotate: 360, transition: { duration: 0.6 } }}
                  >
                    <Icon className="w-6 h-6" />
                  </motion.div>
                  <h3 className="text-xl font-semibold mb-2 text-gray-900">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
