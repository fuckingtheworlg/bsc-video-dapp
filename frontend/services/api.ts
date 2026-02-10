import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

interface UploadResponse {
  success: boolean;
  cid: string;
  size: number;
  fileName?: string;
}

export const api = {
  async uploadVideo(
    file: File,
    address: string,
    signature: string,
    message: string
  ): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append("video", file);

    const response = await axios.post(`${API_URL}/api/upload/video`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
        "X-Wallet-Address": address,
        "X-Signature": signature,
        "X-Message": message,
      },
    });

    return response.data;
  },

  async uploadCover(
    file: File,
    address: string,
    signature: string,
    message: string
  ): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append("cover", file);

    const response = await axios.post(`${API_URL}/api/upload/cover`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
        "X-Wallet-Address": address,
        "X-Signature": signature,
        "X-Message": message,
      },
    });

    return response.data;
  },

  async generateCover(
    videoFile: File,
    address: string,
    signature: string,
    message: string
  ): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append("video", videoFile);

    const response = await axios.post(`${API_URL}/api/cover/generate`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
        "X-Wallet-Address": address,
        "X-Signature": signature,
        "X-Message": message,
      },
    });

    return response.data;
  },
};
