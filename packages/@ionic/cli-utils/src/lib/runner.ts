export abstract class Runner<T, U> {
  abstract run(options: T): Promise<U>;
}
