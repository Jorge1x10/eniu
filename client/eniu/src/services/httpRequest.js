import api from "./api";

export async function httpRequest({
  method,
  url,
  data = null,
  params = null,
  headers = {},
}) {
  try {
    const response = await api.request({
      method,
      url,
      data,
      params,
      headers,
    });

    return {
      success: true,
      data: response.data,
      status: response.status,
    };
  } catch (error) {
    const status = error.response?.status ?? 500;

    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      "Ocurrió un error inesperado";

    return {
      success: false,
      data: error.response?.data ?? null,
      status,
      message,
    };
  }
}