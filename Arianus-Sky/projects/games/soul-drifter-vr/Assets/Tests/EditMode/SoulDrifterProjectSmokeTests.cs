using NUnit.Framework;
using UnityEngine;

public class SoulDrifterProjectSmokeTests
{
    [Test]
    public void Zone1BuilderScriptCanBeInstantiated()
    {
        var host = new GameObject("Zone1BuilderHost");

        try
        {
            var builder = host.AddComponent<Zone1Builder>();
            Assert.That(builder, Is.Not.Null);
        }
        finally
        {
            Object.DestroyImmediate(host);
        }
    }
}
