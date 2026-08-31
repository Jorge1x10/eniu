import { httpRequest } from "../../../services/httpRequest";

export function registerUser(userData) {
  return httpRequest({
    method: "POST",
    url: "/auth/register",
    data: userData,
  });
}

export function loginUser(credentials) {
  return httpRequest({
    method: "POST",
    url: "/auth/login",
    data: credentials,
  });
}

export function authenticateWithGoogle(credential) {
  return httpRequest({
    method: "POST",
    url: "/auth/google",
    data: {
      credential,
    },
  });
}

export function getCurrentUser() {
  return httpRequest({
    method: "GET",
    url: "/auth/me",
  });
}

export function completeGoogleProfile(profileData) {
  return httpRequest({
    method: "PATCH",
    url: "/auth/complete-profile",
    data: profileData,
  });
}
export function updateLanguage(language) {
  return httpRequest({
    method: "PATCH",
    url: "/users/me",
    data: { language },
  });
}
