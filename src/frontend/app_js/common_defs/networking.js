

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
      const err = await response.json();
      error = err.error
    } catch(e) {
      error = `HTTP ${response.status}`
    }
    throw new FetchError(error)
  }
  // const data = await response.json()
  const text = await response.text();
  const data = text ? JSON.parse(text) : '';
  return data
}
