// demoSpec.ts — 'Example ad ka data'
import { defineAd } from "./spec";

export const demoAdSpec = defineAd({
  id: "sneakers-ad",
  elements: [
    {
      id: "shoe-image",
      type: "image",
      role: "hero",
      priority: 1,
      src: "https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?q=80&w=1025&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      alt: "Stylish casual sneakers",
      aspectRatio: 1.4,
    },
    {
      id: "headline",
      type: "text",
      role: "primary",
      priority: 1,
      content: "Walk Your Way",
      maxLines: 2,
    },
    {
      id: "price",
      type: "text",
      role: "secondary",
      priority: 2,
      content: "Only ₹499 — Free Shipping!",
      maxLines: 1,
    },
    {
      id: "cta",
      type: "button",
      role: "action",
      priority: 1,
      label: "Shop Now",
    },
    {
      id: "logo",
      type: "image",
      role: "branding",
      priority: 3,
      src: "https://images.unsplash.com/photo-1706879349357-f17b91de99a5?q=80&w=881&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      alt: "Brand logo",
      aspectRatio: 0.8,
    },
  ],
});
