declare namespace google {
  namespace accounts {
    namespace id {
      interface CredentialResponse {
        credential: string;
        select_by?: string;
      }

      interface IdConfiguration {
        client_id: string;
        callback: (response: CredentialResponse) => void;
      }

      interface GsiButtonConfiguration {
        theme?: 'outline' | 'filled_blue' | 'filled_black';
        size?: 'large' | 'medium' | 'small';
        width?: number;
        text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
        locale?: string;
      }

      function initialize(config: IdConfiguration): void;
      function renderButton(parent: HTMLElement, options: GsiButtonConfiguration): void;
    }
  }
}
