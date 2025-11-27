import { getToken } from "./lib/auth.js";

const ENDPOINT = "/graphql/graphql";
console.log("PRODUCTION ENDPOINT:", import.meta.env.VITE_GRAPHQL_ENDPOINT);

// helper for graphql api calls, fetches and attaches token to the auth token if user is logged in
export async function gqlFetch(query, variables = {}, extraHeaders = {}) {
  if (!ENDPOINT) {
    throw new Error("VITE_GRAPHQL_ENDPOINT is not set in your .env");
  }

  const token = getToken();
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extraHeaders,
    },
    body: JSON.stringify({ query, variables }),
  });


  const text = await res.text();
  
//error handling
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(
      `GraphQL returned non-JSON response (first 200 chars): ${text?.slice(0, 200)}`
    );
  }

  if (!res.ok) {
    const msg = json?.errors?.[0]?.message ?? res.statusText;
    throw new Error(`HTTP ${res.status}: ${msg}`);
  }

  if (json.errors?.length) {
    const msgs = json.errors.map((e) => e.message).join("; ");
    throw new Error(msgs);
  }

  return json.data;
}
