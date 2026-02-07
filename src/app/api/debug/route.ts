export async function GET() {
  const hasGoogle = !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  
  // Show first/last few chars of the key if present (for debugging)
  const googleKeyPreview = process.env.GOOGLE_GENERATIVE_AI_API_KEY 
    ? `${process.env.GOOGLE_GENERATIVE_AI_API_KEY.slice(0,8)}...${process.env.GOOGLE_GENERATIVE_AI_API_KEY.slice(-4)}`
    : 'not set';
  
  return Response.json({
    hasGoogle,
    hasAnthropic,
    hasOpenAI,
    googleKeyPreview,
    nodeEnv: process.env.NODE_ENV,
  });
}
