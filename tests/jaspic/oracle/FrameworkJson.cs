#if NETFRAMEWORK
// The old application uses Newtonsoft.Json 13.0.3, not System.Text.Json.
using Newtonsoft.Json;
static class FrameworkJson {
  public static T Deserialize<T>(string value) { return JsonConvert.DeserializeObject<T>(value)!; }
  public static string Serialize(object value) { return JsonConvert.SerializeObject(value); }
}
#endif
