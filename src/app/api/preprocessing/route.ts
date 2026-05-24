import { PreprocessingResponse } from '@/app/types/preprocessing';
import { NextRequest, NextResponse } from 'next/server';

// 1. Route Handlers must return a Promise<Response> or Promise<NextResponse>
export async function POST(request: NextRequest): Promise<NextResponse<PreprocessingResponse | { error: string }>> {
  try {

    const externalFormData = new FormData();
  
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND}/preprocessing`, {
      method: 'POST',
      body: externalFormData
    });

    // 2. Type the JSON parsing step
    const data = (await res.json()) as PreprocessingResponse;
    
    // 3. Pass the structured data back inside NextResponse
    return NextResponse.json(data);

  } catch (error) {
    // Safely capture the error message for TypeScript
    const message = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
