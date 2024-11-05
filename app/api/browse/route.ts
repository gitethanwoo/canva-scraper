import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    
    // First, get the total page count
    const countRes = await fetch(`${req.headers.get('origin')}/api/page-count`, {
      method: 'POST',
      body: JSON.stringify({ url })
    });
    
    const { totalPages } = await countRes.json();
    if (!totalPages) {
      throw new Error('Could not determine page count');
    }

    console.log(`Capturing ${totalPages} pages in parallel`);

    // Create an array of promises for each page capture
    const capturePromises = Array.from({ length: totalPages }, (_, i) => 
      fetch(`${req.headers.get('origin')}/api/capture-page`, {
        method: 'POST',
        body: JSON.stringify({ url, pageNumber: i + 1 })
      }).then(res => res.json())
    );

    // Wait for all captures to complete
    const results = await Promise.all(capturePromises);
    
    // Sort by page number and format response
    const screenshots = results
      .filter(result => !result.error)
      .sort((a, b) => a.pageNumber - b.pageNumber)
      .map(({ pageNumber, base64Image }) => ({
        pageNumber,
        base64Image
      }));

    console.log(`Successfully captured ${screenshots.length} pages`);
    return NextResponse.json({ screenshots });

  } catch (error) {
    console.error('Screenshot capture failed:', error);
    return NextResponse.json({ 
      error: 'Failed to capture screenshots',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
