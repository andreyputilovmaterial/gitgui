

// hmm, not sure I need it
// it is doing both, fetch and decide json
// probably a common pattern
// but this is not used a lot, I can just make normal native fetch and check if response.ok
export class FetchError extends Error { name = 'FetchError' }
export async function fetchWrapper(method,endpoint,payload) {
  const response = await fetch(
    endpoint,
      {method: method,
      headers: {
          "Content-Type": "application/json"
      },
      body: ['GET','HEAD'].includes(method) ? undefined : JSON.stringify(payload),
    },
  )
  if (!response.ok) {
    let error = `HTTP ${response.status}`
    try {
      error = await response.json();
      error = error.payload.error
    } catch(e) {
      error = `HTTP ${response.status}: ${error}`
    }
    throw new FetchError(error)
  }
  // const data = await response.json()
  const text = await response.text();
  const data = text ? JSON.parse(text) : '';
  return data
}
