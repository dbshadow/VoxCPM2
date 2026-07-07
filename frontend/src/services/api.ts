export interface ApiConfig {
  baseUrl: string;
  apiKey: string;
}

export const getApiConfig = (): ApiConfig => {
  const baseUrl = localStorage.getItem("voxcpm_api_url") || "http://localhost:8000";
  const apiKey = localStorage.getItem("voxcpm_api_key") || "";
  return { baseUrl, apiKey };
};

export const saveApiConfig = (baseUrl: string, apiKey: string): void => {
  // Normalize trailing slash
  const normalizedUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  localStorage.setItem("voxcpm_api_url", normalizedUrl);
  localStorage.setItem("voxcpm_api_key", apiKey);
};

export const getHeaders = (isMultipart = false): Record<string, string> => {
  const { apiKey } = getApiConfig();
  const headers: Record<string, string> = {};
  
  if (!isMultipart) {
    headers["Content-Type"] = "application/json";
  }
  
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }
  
  return headers;
};

// ----------------- System API -----------------
export const checkApiStatus = async (): Promise<any> => {
  const { baseUrl } = getApiConfig();
  const response = await fetch(`${baseUrl}/api/status`, {
    method: "GET",
    headers: getHeaders(),
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return response.json();
};

export const getTtsLogsEventSource = (): EventSource => {
  const { baseUrl, apiKey } = getApiConfig();
  const tokenQuery = apiKey ? `?token=${encodeURIComponent(apiKey)}` : "";
  return new EventSource(`${baseUrl}/api/tts/logs${tokenQuery}`);
};

// ----------------- TTS API -----------------
export interface DesignParams {
  text: string;
  cfg_value: number;
  inference_timesteps: number;
  normalize: boolean;
  denoise: boolean;
  seed?: number | null;
  speed_rate: number;
}

export interface InferenceResult {
  audioBlob: Blob;
  seed: number;
}

export const runTtsDesign = async (params: DesignParams): Promise<InferenceResult> => {
  const { baseUrl } = getApiConfig();
  const response = await fetch(`${baseUrl}/api/tts/design`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(params),
  });
  
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: "Speech synthesis failed" }));
    throw new Error(err.detail || `Inference failed: ${response.status}`);
  }
  
  const audioBlob = await response.blob();
  const seedHeader = response.headers.get("X-Generated-Seed");
  const seed = seedHeader ? parseInt(seedHeader, 10) : 0;
  
  return { audioBlob, seed };
};

export interface CloneParams {
  reference_wav: Blob;
  text: string;
  cfg_value: number;
  inference_timesteps: number;
  normalize: boolean;
  denoise: boolean;
  seed?: number | null;
  speed_rate: number;
}

export const runTtsClone = async (params: CloneParams): Promise<InferenceResult> => {
  const { baseUrl } = getApiConfig();
  const formData = new FormData();
  
  formData.append("reference_wav", params.reference_wav, "reference.wav");
  formData.append("text", params.text);
  formData.append("cfg_value", params.cfg_value.toString());
  formData.append("inference_timesteps", params.inference_timesteps.toString());
  formData.append("normalize", params.normalize.toString());
  formData.append("denoise", params.denoise.toString());
  formData.append("speed_rate", params.speed_rate.toString());
  if (params.seed !== undefined && params.seed !== null) {
    formData.append("seed", params.seed.toString());
  }
  
  const response = await fetch(`${baseUrl}/api/tts/clone`, {
    method: "POST",
    headers: getHeaders(true), // isMultipart = true
    body: formData,
  });
  
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: "Voice clone failed" }));
    throw new Error(err.detail || `Inference failed: ${response.status}`);
  }
  
  const audioBlob = await response.blob();
  const seedHeader = response.headers.get("X-Generated-Seed");
  const seed = seedHeader ? parseInt(seedHeader, 10) : 0;
  
  return { audioBlob, seed };
};

export interface UltimateParams {
  reference_wav: Blob;
  text: string;
  prompt_text: string;
  cfg_value: number;
  inference_timesteps: number;
  normalize: boolean;
  denoise: boolean;
  seed?: number | null;
  speed_rate: number;
}

export const runTtsUltimate = async (params: UltimateParams): Promise<InferenceResult> => {
  const { baseUrl } = getApiConfig();
  const formData = new FormData();
  
  formData.append("reference_wav", params.reference_wav, "reference.wav");
  formData.append("text", params.text);
  formData.append("prompt_text", params.prompt_text);
  formData.append("cfg_value", params.cfg_value.toString());
  formData.append("inference_timesteps", params.inference_timesteps.toString());
  formData.append("normalize", params.normalize.toString());
  formData.append("denoise", params.denoise.toString());
  formData.append("speed_rate", params.speed_rate.toString());
  if (params.seed !== undefined && params.seed !== null) {
    formData.append("seed", params.seed.toString());
  }
  
  const response = await fetch(`${baseUrl}/api/tts/ultimate`, {
    method: "POST",
    headers: getHeaders(true),
    body: formData,
  });
  
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: "Ultimate clone failed" }));
    throw new Error(err.detail || `Inference failed: ${response.status}`);
  }
  
  const audioBlob = await response.blob();
  const seedHeader = response.headers.get("X-Generated-Seed");
  const seed = seedHeader ? parseInt(seedHeader, 10) : 0;
  
  return { audioBlob, seed };
};
