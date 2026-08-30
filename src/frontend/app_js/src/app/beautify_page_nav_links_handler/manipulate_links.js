import { defineComponent, h, markRaw, onMounted } from 'vue';


import Window from './window_component';
import safetyUrlCheck from './safetycheck';


const LinksSiteComponent = {
  props: [
    'repoActions',
  ],
  template: `<span class="gitgui-navlinks-manipulate-component"></span>`, // empty is raising warning
  setup(props) {

    const init = () => {

      const readUrl = linkEl => {
        const urlRaw = linkEl.getAttribute( 'href' );
        const url = new URL( urlRaw, window.location.origin );
        url.searchParams.set( 'embed', '1' );
        // const result = url.pathname + url.search + url.hash;
        // return result;
        return url.toString();
      };

      const createLinkHandler = url => {
        const MyWindowSpecificToThisUrl = defineComponent( {
          setup( _, { attrs } ) {
            try {
              return /* render fn */ () => {
                try {
                  return h( Window, {
                    ...attrs,
                    url,
                  } );
                } catch( e ) {
                  props.repoActions.logError( e );
                  throw e;
                }
              }
            } catch( e ) {
              props.repoActions.logError( e );
              throw e;
            }
          },
        } )
        return function( event ) {
          event.preventDefault();
          ( async function() {
            await props.repoActions.createModal( MyWindowSpecificToThisUrl )
          } )();
          return false;
        }
      }

      Array.from( document.querySelectorAll( '[navigation-role] a, a[navigation-role]' ) ).forEach( function( linkEl ) {
        try {

          const url = readUrl( linkEl );
          if( safetyUrlCheck( url ) )
            linkEl.addEventListener( 'click', createLinkHandler( url ) );

        } catch( e ) {
          try {
            props.repoActions.logError( e );
          } catch( ee ) {
            // ok to ignore
          }
        }
      } );
    };


    onMounted( async () => {
      await Promise.all( [
        ( function() {
          init();
          return null;
        } )(),
      ] )
    } );

  },
}
export default LinksSiteComponent;
