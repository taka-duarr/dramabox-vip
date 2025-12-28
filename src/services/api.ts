import axios from "axios";
import { VipResponse } from "../types/drama";
import { Episode } from "../types/episode";

const api = axios.create({
  baseURL: "https://dramabox.sansekai.my.id/api",
  timeout: 20000,
});

export const getVipDrama = async (): Promise<VipResponse> => {
  const response = await api.get<VipResponse>("/dramabox/vip");
  return response.data;
};

export const getAllEpisodes = async (bookId: string): Promise<Episode[]> => {
  const res = await api.get<Episode[]>(`/dramabox/allepisode?bookId=${bookId}`);
  return res.data;
};

export const getLatestDrama = async () => {
  const res = await api.get("/dramabox/latest");
  return res.data;
};

export const getSearchDrama = async (query: string) => {
  const res = await fetch(
    `https://dramabox.sansekai.my.id/api/dramabox/search?query=${encodeURIComponent(
      query
    )}`
  );
  return res.json();
};


export const getTrendingDrama = async () => {
  const res = await api.get("/dramabox/trending");
  return res.data;
};

export const getForYouDrama = async () => {
  const res = await api.get("/dramabox/foryou");
  return res.data;
};




