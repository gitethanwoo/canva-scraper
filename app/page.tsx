'use client';
import { useState } from 'react';
import Image from 'next/image';

export default function Home() {
  const [images, setImages] = useState<string[]>([]);

  const captureScreenshots = async () => {
    const res = await fetch('/api/browse', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://www.canva.com/design/DAGQTrp4mgM/a2CYQUy40O1EkSZnb4y7bg/view?utm_content=DAGQTrp4mgM&utm_campaign=designshare&utm_medium=link&utm_source=editor' })
    });
    const data = await res.json();
    if (data.screenshots) {
      const imageUrls = data.screenshots.map((base64: string) => 
        `data:image/png;base64,${base64}`
      );
      setImages(imageUrls);
    }
  };

  return (
    <div>
      <button onClick={captureScreenshots}>Capture Screenshots</button>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {images.map((image, index) => (
          <Image 
            key={index}
            src={image} 
            alt={`Screenshot ${index + 1}`} 
            width={800} 
            height={600}
            unoptimized
          />
        ))}
      </div>
    </div>
  );
}
