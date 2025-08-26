// src/components/AnimatedCTA.js
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";

export default function AnimatedCTA() {
  const location = useLocation();
  const isProductos = location.pathname === "/productos";
  return (
    <div className="d-flex justify-content-center my-4">
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        {isProductos ? (
          <Link to="/" className="btn btn-secondary btn-lg px-4">Volver</Link>
        ) : (
          <Link to="/productos" className="btn btn-primary btn-lg px-4">Ver Catálogo</Link>
        )}
      </motion.div>
    </div>
  );
}
