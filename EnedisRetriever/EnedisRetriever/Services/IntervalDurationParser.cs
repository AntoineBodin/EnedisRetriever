using System.Xml;

namespace EnedisRetriever.Services;

public static class IntervalDurationParser
{
    public static TimeSpan Parse(string value)
    {
        return XmlConvert.ToTimeSpan(value);
    }
}