import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="container text-center mt-5">
      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
        <Link to="/productos" className="btn btn-primary">
          Ver productos
        </Link>
      </motion.div>
    </div>
  );
}