import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import sty from "./Sidebar.module.css";

export default function Tooltip({ show, type, anchorRef, onClose }) {
  const [position, setPosition] = useState({ top: 100, left: 400 });

  useEffect(() => {
    if (anchorRef?.current && show) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top + window.scrollY,
        left: rect.right + 10
      });
    }
  }, [anchorRef, show]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!anchorRef?.current?.contains(e.target)) {
        onClose?.();
      }
    };

    if (show) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [show, anchorRef, onClose]);

  if (!show) return null;

  let content;

  if (type === "variable") {
    content = (
      <>
        <p><strong>Walking comfort weight:</strong></p>
        <ul className={sty["tooltip-list"]}>
          <li><strong>0</strong>: Complete barrier</li>
          <li><strong>0–1</strong>: Less comfortable</li>
          <li><strong>1</strong>: Fully comfortable</li>
        </ul>
      </>
    );
  }

  return ReactDOM.createPortal(
    <div
      className={sty["tooltip-portal"]}
      style={{ top: position.top, left: position.left }}
    >
      {content}
    </div>,
    document.body
  );
}
