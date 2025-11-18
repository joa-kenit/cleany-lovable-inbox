import { Button } from "@/components/ui/button";
import { Mail, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

export function LandingCTA() {
  const navigate = useNavigate();

  return (
    <section className="px-6 py-20 lg:px-8 lg:py-32 bg-gradient-to-br from-rose-800 to-rose-900">
      <motion.div 
        className="mx-auto max-w-4xl text-center"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7 }}
      >
        <h2 className="text-4xl lg:text-5xl font-bold tracking-tight text-white mb-6">
          Ready to transform your inbox?
        </h2>
        <p className="text-xl text-orange-100 mb-10 max-w-2xl mx-auto">
          Join thousands of users who have decluttered their inbox and discovered their email personality with Cleany.
        </p>
        
        <motion.div 
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <Button 
            size="lg" 
            className="bg-white text-rose-900 hover:bg-orange-50"
            onClick={() => navigate('/auth')}
          >
            <Mail className="w-5 h-5 mr-2" />
            Start Cleaning for Free
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-rose-900">
            Schedule a Demo
          </Button>
        </motion.div>

        <motion.div 
          className="mt-10 flex items-center justify-center gap-12 text-orange-100"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          <div className="flex flex-col">
            <span className="text-3xl font-bold text-white">50K+</span>
            <span className="text-sm">Users</span>
          </div>
          <div className="flex flex-col">
            <span className="text-3xl font-bold text-white">10M+</span>
            <span className="text-sm">Emails Cleaned</span>
          </div>
          <div className="flex flex-col">
            <span className="text-3xl font-bold text-white">4.9/5</span>
            <span className="text-sm">Rating</span>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
