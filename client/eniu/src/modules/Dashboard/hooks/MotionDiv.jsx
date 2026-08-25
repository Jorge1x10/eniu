import { AnimatePresence, motion } from "framer-motion";
import { useLocation, useOutlet } from "react-router";

export default function MotionDiv() {
  const location = useLocation();
  const outlet = useOutlet();
  return (
    <AnimatePresence mode="wait" >
      <motion.div
        key={location.pathname} 
        className="min-h-0"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16 }}
        transition={{ duration: 0.15, ease: '' }}
      >
        {outlet}
      </motion.div>
    </AnimatePresence>
  );
}
