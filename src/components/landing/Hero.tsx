import { Button } from "@/components/ui/button";
import { Sparkles, Mail, ArrowDown } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

export function LandingHero() {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden px-6 py-32 lg:px-8 lg:py-48 bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50">
      {/* Decorative background elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 left-10 w-96 h-96 bg-rose-300 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob"></div>
        <div className="absolute top-40 right-10 w-96 h-96 bg-orange-300 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-1/2 w-96 h-96 bg-amber-300 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob animation-delay-4000"></div>
      </div>

      {/* Floating decorative shapes */}
      <motion.div
        className="absolute top-32 right-1/4 w-20 h-20 border-4 border-rose-400 rounded-full opacity-20"
        animate={{ 
          y: [0, -20, 0],
          rotate: [0, 90, 0]
        }}
        transition={{ 
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div
        className="absolute bottom-32 left-1/4 w-16 h-16 bg-orange-400 rounded-lg opacity-20"
        animate={{ 
          y: [0, 20, 0],
          rotate: [0, -90, 0]
        }}
        transition={{ 
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div
        className="absolute top-1/2 left-12 w-12 h-12 border-4 border-amber-400 rounded-lg opacity-20"
        animate={{ 
          x: [0, 15, 0],
          y: [0, -15, 0],
          rotate: [0, 180, 0]
        }}
        transition={{ 
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col items-center text-center gap-10">
          <motion.div 
            className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm text-rose-800 px-5 py-2.5 rounded-full shadow-lg border border-rose-200"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            whileHover={{ scale: 1.05 }}
          >
            <Sparkles className="w-4 h-4" />
            <span>Your inbox, decluttered</span>
          </motion.div>
          
          <motion.div 
            className="flex flex-col gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-6xl lg:text-7xl xl:text-8xl tracking-tight font-bold">
              <motion.span 
                className="inline-block bg-gradient-to-r from-rose-600 via-rose-700 to-orange-600 bg-clip-text text-transparent"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
              >
                Clean your inbox.
              </motion.span>
              <br />
              <motion.span 
                className="inline-block bg-gradient-to-r from-orange-600 via-amber-600 to-rose-600 bg-clip-text text-transparent"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
              >
                Know yourself better.
              </motion.span>
            </h1>
            <motion.p 
              className="text-xl lg:text-2xl text-rose-900/80 max-w-3xl mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.6 }}
            >
              Cleany helps you free up space in your Gmail inbox by grouping emails by sender, while discovering your unique inbox personality.
            </motion.p>
          </motion.div>

          <motion.div 
            className="flex flex-col sm:flex-row gap-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.5 }}
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                size="lg" 
                className="bg-rose-800 hover:bg-rose-900 text-white px-8 py-6 text-lg shadow-xl shadow-rose-800/30"
                onClick={() => navigate('/app')}
              >
                <Mail className="w-5 h-5 mr-2" />
                Get Started Free
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button size="lg" variant="outline" className="border-2 border-rose-800 text-rose-800 hover:bg-rose-800 hover:text-white px-8 py-6 text-lg bg-white/80 backdrop-blur-sm">
                Watch Demo
              </Button>
            </motion.div>
          </motion.div>

          <motion.div 
            className="flex items-center gap-8 text-sm text-rose-900/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1, duration: 0.5 }}
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-rose-800" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Free forever
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-rose-800" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              No credit card required
            </div>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
            animate={{ y: [0, 10, 0] }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <ArrowDown className="w-6 h-6 text-rose-400" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
