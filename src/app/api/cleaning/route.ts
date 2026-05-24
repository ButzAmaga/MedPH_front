import { CleaningResponse } from '@/app/types/cleaning';
import { NextRequest, NextResponse } from 'next/server';

// 1. Route Handlers must return a Promise<Response> or Promise<NextResponse>
export async function POST(request: NextRequest): Promise<NextResponse<CleaningResponse | { error: string }>> {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    // Validate that the file exists and is actually a File instance
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const externalFormData = new FormData();
    externalFormData.append('file', file);

    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND}/cleaning/clean?is_2022_format=false`, {
      method: 'POST',
      body: externalFormData
    });

    // 2. Type the JSON parsing step
    const data = (await res.json()) as CleaningResponse;
    
    // 3. Pass the structured data back inside NextResponse
    return NextResponse.json(data);

  } catch (error) {
    // Safely capture the error message for TypeScript
    const message = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
