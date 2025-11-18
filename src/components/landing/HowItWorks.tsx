import { motion } from "framer-motion";
import { Mail, FolderTree, Trash2, Sparkles } from "lucide-react";

const steps = [
  {
    icon: Mail,
    title: "Connect Your Gmail",
    description: "Securely connect your Gmail account in seconds with OAuth authentication.",
    color: "from-rose-500 to-orange-500"
  },
  {
    icon: FolderTree,
    title: "Auto-Group Emails",
    description: "We automatically organize your emails by sender, showing you who's filling up your inbox.",
    color: "from-orange-500 to-amber-500"
  },
  {
    icon: Trash2,
    title: "Bulk Delete",
    description: "Select senders and delete hundreds of emails with a single click. Reclaim your storage instantly.",
    color: "from-amber-500 to-rose-500"
  },
  {
    icon: Sparkles,
    title: "Discover Your Personality",
    description: "Get insights into your inbox habits and discover your unique email personality type.",
    color: "from-rose-500 to-rose-700"
  }
];

export function LandingHowItWorks() {
  return (
    <section className="px-6 py-20 lg:px-8 lg:py-32 bg-gradient-to-b from-white to-amber-50">
      <div className="mx-auto max-w-7xl">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl lg:text-5xl font-bold tracking-tight text-gray-900 mb-4">
            How It Works
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Get started in minutes and transform your inbox experience
          </p>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={index}
                className="relative"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
              >
                <div className="flex flex-col items-center text-center">
                  <motion.div 
                    className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-6 shadow-lg`}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Icon className="w-10 h-10 text-white" />
                  </motion.div>
                  <div className="absolute top-10 left-1/2 -translate-x-1/2 w-8 h-8 bg-rose-800 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-md">
                    {index + 1}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{step.title}</h3>
                  <p className="text-gray-600">{step.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
