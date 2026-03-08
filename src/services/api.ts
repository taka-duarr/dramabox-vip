import axios from "axios";
import axiosRetry from "axios-retry";
import { VipResponse } from "../types/drama";
import { Episode } from "../types/episode";

const api = axios.create({
  baseURL: "https://dramabox.sansekai.my.id/api",
  timeout: 30000, // Timeout diperpanjang hingga 30 detik
});

// Konfigurasi axios-retry
axiosRetry(api, {
  retries: 3, // Coba lagi maksimal 3 kali 
  retryDelay: (retryCount) => {
    console.log(`[API RETRY] Menunggu server... Percobaan ke-${retryCount}`);
    return retryCount * 2000; // jeda 2 detik, 4 detik, dst.
  },
  retryCondition: (error) => {
    // Jalankan retry jika status 429 atau 5xx
    const status = error.response?.status;
    return (
      axiosRetry.isNetworkOrIdempotentRequestError(error) ||
      status === 429 ||
      status === 500 ||
      status === 502 ||
      status === 503 ||
      status === 504
    );
  },
});

// Sederhana In-Memory Caching
const CACHE_EXPIRATION_MS = 1000 * 60 * 5; // 5 Menit
const cache: Record<string, { data: any; timestamp: number }> = {};

const fetchWithCache = async <T>(url: string, fetcher: () => Promise<T>): Promise<T> => {
  const now = Date.now();
  if (cache[url] && now - cache[url].timestamp < CACHE_EXPIRATION_MS) {
    console.log(`[CACHE HIT] Mengambil ${url} dari Memori lokal`);
    return cache[url].data;
  }
  
  const data = await fetcher();
  cache[url] = { data, timestamp: now };
  return data;
};

export const getVipDrama = async (): Promise<VipResponse> => {
  return fetchWithCache("/dramabox/vip", async () => {
    const response = await api.get<VipResponse>("/dramabox/vip");
    return response.data;
  });
};

export const getAllEpisodes = async (bookId: string): Promise<Episode[]> => {
  return fetchWithCache(`/dramabox/allepisode?bookId=${bookId}`, async () => {
    const res = await api.get<Episode[]>(`/dramabox/allepisode?bookId=${bookId}`);
    return res.data;
  });
};

export const getLatestDrama = async () => {
  return fetchWithCache("/dramabox/latest", async () => {
    const res = await api.get("/dramabox/latest");
    return res.data;
  });
};

export const getSearchDrama = async (query: string) => {
  const encodedQuery = encodeURIComponent(query);
  return fetchWithCache(`/dramabox/search?query=${encodedQuery}`, async () => {
    const res = await api.get(`/dramabox/search?query=${encodedQuery}`);
    return res.data;
  });
};

export const getTrendingDrama = async () => {
  return fetchWithCache("/dramabox/trending", async () => {
    const res = await api.get("/dramabox/trending");
    return res.data;
  });
};

export const getForYouDrama = async () => {
  return fetchWithCache("/dramabox/foryou", async () => {
    const res = await api.get("/dramabox/foryou");
    return res.data;
  });
};

export const getDetailDrama = async (bookId: string) => {
  return fetchWithCache(`/dramabox/detail?bookId=${bookId}`, async () => {
    const res = await api.get(`/dramabox/detail?bookId=${bookId}`);
    return res.data;
  });
};




