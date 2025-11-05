export default class Utils {

  public static async timeOut(miliseconds: number, func: Function|void) : Promise<Function|undefined>{ 
    if (func) {
      setTimeout(() => {
        return func();
      }, miliseconds); 
    }
    return undefined;
  }

}
