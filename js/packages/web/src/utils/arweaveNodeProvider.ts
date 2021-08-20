import Arweave from 'arweave';
import { Queue } from './queue';

export default class ArweaveNodeProvider {
  private static instance: ArweaveNodeProvider;

  private actual_provider: object = {}; // First and default provider.
  private providers = new Queue<object>(); // Other providers.
  private errors: number;
  private MAX_ERRORS: number;

  /**
   * The Singleton's constructor should always be private to prevent direct
   * construction calls with the `new` operator.
   */
  private constructor() {
    // The current URL path will be used by default. This is recommended when running from a gateway.
    this.errors = 0;
    this.MAX_ERRORS = 5;
    this.providers.extend([
      {
        host: 'arweave.net',
      },
    ]);
  }

  /**
   * The static method that controls the access to the singleton instance.
   *
   * This implementation let you subclass the Singleton class while keeping
   * just one instance of each subclass around.
   */
  private static getInstance(): ArweaveNodeProvider {
    if (!ArweaveNodeProvider.instance) {
      ArweaveNodeProvider.instance = new ArweaveNodeProvider();
    }
    return ArweaveNodeProvider.instance;
  }

  /**
   *
   * @returns Arweave object.
   * The init method only translates the object,
   *  so it shouldn't be expensive
   */
  private getProvider() {
    return Arweave.init(this.actual_provider);
  }

  /**
   *
   * Select the best arweave node provider.
   * An stack could be used for manage them.
   */
  private changeProvider() {
    // Store the provider that raise the errors.
    this.providers.push(this.actual_provider);

    // Get a new arweave node provider.
    this.actual_provider = this.providers.pop();
  }

  /**
   * Can be used for count node connection errors.
   */
  private setError() {
    if (this.errors < this.MAX_ERRORS) {
      this.errors++;
    } else {
      this.errors = 0;
      this.changeProvider();
    }
  }

  public static getProvider() {
    return ArweaveNodeProvider.getInstance().getProvider();
  }

  public static setError() {
    ArweaveNodeProvider.getInstance().setError();
  }
}
