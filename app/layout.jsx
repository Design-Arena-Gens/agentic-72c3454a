import "./globals.css";

export const metadata = {
  title: "Voxel Castle Journey",
  description: "A cinematic voxel world rendered with Three.js"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
