import React, { useState } from "react";
import "./index.css";

interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
}

export default function Image({ src, ...rest }: ImageProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <img
      src={src}
      className={`custom-image ${loaded ? "loaded" : ""}`}
      onLoad={() => setLoaded(true)}
      loading="lazy"
      {...rest}
    />
  );
}
