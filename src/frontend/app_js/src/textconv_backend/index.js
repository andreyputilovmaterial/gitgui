
const textconvFactory = repoActions =>

  async function textconv(data,filename) {
    try {
      const response = await fetch(`/textconv?filepath=${filename}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
        },
        body: data,
      });
      if( !response.ok ) {
        let error = `Failed requesting /textconv: HTTP ${response.status}`;
        try {
          error = await response.text();
          error = `Failed requesting /textconv: HTTP ${response.status}: ${error}`;
        } catch(e) {
          // ok to ignore
        }
        throw new Error(error);
      }
      return await response.text();
    } catch(e) {
      repoActions.logError(e);
      repoActions.logError(`Failed requesting /textconv endpoint for "${filename}"`);
      throw e;
    }
  }

export default textconvFactory;
