using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

public static class PlaceholderMaterialCreator
{
    // Zone 1 Color Palette
    public static readonly Color ThermalCore = HexToColor("#FF3333");
    public static readonly Color ThermalGlow = HexToColor("#FF6600");
    public static readonly Color ArianSky = HexToColor("#E0F0FF");
    public static readonly Color Silver = HexToColor("#C0C0E0");
    public static readonly Color NagaIchor = HexToColor("#1a3d1a");
    public static readonly Color NagaVeins = HexToColor("#39FF14");
    public static readonly Color SartanGold = HexToColor("#B8860B");
    public static readonly Color ZoneGateEnergy = HexToColor("#FFE4B5");
    public static readonly Color UIBackground = HexToColor("#1a1a2e");
    public static readonly Color UIAccent = HexToColor("#FFD700");

    public static Color HexToColor(string hex)
    {
        Color color;
        ColorUtility.TryParseHtmlString(hex, out color);
        return color;
    }

    // Create Thermal Core Material (Fire)
    public static Material CreateThermalCoreMaterial()
    {
        Material mat = new Material(Shader.Find("Universal Render Pipeline/Lit"));
        mat.name = "ThermalCore";
        mat.color = ThermalCore;
        mat.EnableKeyword("_EMISSION");
        mat.SetColor("_EmissionColor", ThermalGlow * 2.0f);
        mat.SetFloat("_Smoothness", 0.3f);
        mat.SetFloat("_Metallic", 0.0f);
        return mat;
    }

    // Create Sky Island Material (Air)
    public static Material CreateSkyIslandMaterial()
    {
        Material mat = new Material(Shader.Find("Universal Render Pipeline/Lit"));
        mat.name = "SkyIsland";
        mat.color = ArianSky;
        mat.SetFloat("_Smoothness", 0.8f);
        mat.SetFloat("_Metallic", 0.1f);
        return mat;
    }

    // Create Naga Corruption Material
    public static Material CreateNagaCorruptionMaterial()
    {
        Material mat = new Material(Shader.Find("Universal Render Pipeline/Lit"));
        mat.name = "NagaCorruption";
        mat.color = NagaIchor;
        mat.EnableKeyword("_EMISSION");
        mat.SetColor("_EmissionColor", NagaVeins * 1.5f);
        mat.SetFloat("_Smoothness", 0.2f);
        mat.SetFloat("_Metallic", 0.0f);
        return mat;
    }

    // Create Zone Gate Material
    public static Material CreateZoneGateMaterial()
    {
        Material mat = new Material(Shader.Find("Universal Render Pipeline/Lit"));
        mat.name = "ZoneGate";
        mat.color = ZoneGateEnergy;
        mat.EnableKeyword("_EMISSION");
        mat.SetColor("_EmissionColor", Color.white * 1.0f);
        mat.SetFloat("_Smoothness", 0.9f);
        mat.SetFloat("_Metallic", 0.5f);
        return mat;
    }

    // Create UI Surface Material
    public static Material CreateUISurfaceMaterial()
    {
        Material mat = new Material(Shader.Find("Universal Render Pipeline/Unlit"));
        mat.name = "UISurface";
        mat.color = UIBackground;
        return mat;
    }

    // Create All Materials at Runtime
    public static void CreateAllMaterials()
    {
        string matFolder = "Assets/Materials/Placeholders/";

#if UNITY_EDITOR
        if (!UnityEditor.AssetDatabase.IsValidFolder(matFolder))
        {
            UnityEditor.AssetDatabase.CreateFolder("Assets/Materials", "Placeholders");
        }

        UnityEditor.AssetDatabase.CreateAsset(CreateThermalCoreMaterial(), matFolder + "ThermalCore.mat");
        UnityEditor.AssetDatabase.CreateAsset(CreateSkyIslandMaterial(), matFolder + "SkyIsland.mat");
        UnityEditor.AssetDatabase.CreateAsset(CreateNagaCorruptionMaterial(), matFolder + "NagaCorruption.mat");
        UnityEditor.AssetDatabase.CreateAsset(CreateZoneGateMaterial(), matFolder + "ZoneGate.mat");
        UnityEditor.AssetDatabase.CreateAsset(CreateUISurfaceMaterial(), matFolder + "UISurface.mat");

        UnityEditor.AssetDatabase.SaveAssets();
        Debug.Log("Created 5 placeholder materials for Zone 1");
#endif
    }
}
