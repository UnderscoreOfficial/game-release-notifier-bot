export default class Utils {
  public static async timeOut(
    miliseconds: number,
    func: Function | void,
  ): Promise<Function | undefined> {
    if (func) {
      setTimeout(() => {
        return func();
      }, miliseconds);
    }
    return undefined;
  }

  public static sleep(miliseconds: number) {
    return new Promise((resolve) => setTimeout(resolve, miliseconds));
  }
}
