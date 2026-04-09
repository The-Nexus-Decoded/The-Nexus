using NUnit.Framework;
using UnityEngine;

public class SoulDrifterProjectSmokeTests
{
    [Test]
    public void ProjectIdentityMatchesScaffold()
    {
        Assert.That(Application.productName, Is.EqualTo("Soul Drifter VR"));
        Assert.That(Application.companyName, Is.EqualTo("The-Nexus"));
    }
}
