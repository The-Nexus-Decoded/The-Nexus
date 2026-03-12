// Soul Drifters — Unity Placeholder Materials
// Zone 1 Demo | Quick Setup for Vasu
// Generated 2026-03-11

using UnityEngine;

public static class SoulDrifterMaterials
{
    // ============================================
    // REALM MATERIALS
    // ============================================

    public static Material CreateFireMaterial()
    {
        var mat = new Material(Shader.Find("Standard"));
        mat.name = "Arianus_Fire";
        mat.color = new Color(1f, 0.2f, 0.2f); // #FF3333
        mat.EnableKeyword("_EMISSION");
        mat.SetColor("_EmissionColor", new Color(1f, 0.4f, 0f) * 0.5f); // #FF6600
        mat.SetFloat("_EmissionIntensity", 0.5f);
        return mat;
    }

    public static Material CreateWaterMaterial()
    {
        var mat = new Material(Shader.Find("Standard"));
        mat.name = "Pryan_Water";
        mat.color = new Color(0.2f, 0.2f, 1f); // #3333FF
        mat.EnableKeyword("_EMISSION");
        mat.SetColor("_EmissionColor", new Color(0.4f, 0.67f, 1f) * 0.3f); // #66AAFF
        mat.SetFloat("_EmissionIntensity", 0.3f);
        return mat;
    }

    public static Material CreateEarthMaterial()
    {
        var mat = new Material(Shader.Find("Standard"));
        mat.name = "Chelestra_Earth";
        mat.color = new Color(0.2f, 1f, 0.2f); // #33FF33
        mat.EnableKeyword("_EMISSION");
        mat.SetColor("_EmissionColor", new Color(0.4f, 1f, 0.4f) * 0.2f); // #66FF66
        mat.SetFloat("_EmissionIntensity", 0.2f);
        return mat;
    }

    public static Material CreateVoidMaterial()
    {
        var mat = new Material(Shader.Find("Standard"));
        mat.name = "Abarrach_Void";
        mat.color = Color.black; // #000000
        mat.EnableKeyword("_EMISSION");
        mat.SetColor("_EmissionColor", new Color(0.1f, 0.1f, 0.18f) * 0.4f); // #1a1a2e
        mat.SetFloat("_EmissionIntensity", 0.4f);
        return mat;
    }

    // ============================================
    // THEME MATERIALS
    // ============================================

    public static Material CreateThermalCoreMaterial()
    {
        var mat = new Material(Shader.Find("Standard"));
        mat.name = "ThermalCore";
        mat.color = new Color(1f, 0.4f, 0f); // Orange
        mat.EnableKeyword("_EMISSION");
        mat.SetColor("_EmissionColor", new Color(1f, 0.6f, 0f) * 0.6f);
        mat.SetFloat("_EmissionIntensity", 0.6f);
        return mat;
    }

    public static Material CreateNagaCorruptionMaterial()
    {
        var mat = new Material(Shader.Find("Standard"));
        mat.name = "NagaCorruption";
        mat.color = new Color(0f, 0f, 0f); // Black
        mat.EnableKeyword("_EMISSION");
        mat.SetColor("_EmissionColor", new Color(0.22f, 1f, 0.08f) * 0.3f); // #39FF14
        mat.SetFloat("_EmissionIntensity", 0.3f);
        return mat;
    }

    public static Material CreateSartanMagicMaterial()
    {
        var mat = new Material(Shader.Find("Standard"));
        mat.name = "SartanMagic";
        mat.color = new Color(0.72f, 0.53f, 0.04f); // #B8860B
        mat.EnableKeyword("_EMISSION");
        mat.SetColor("_EmissionColor", new Color(0.83f, 0.69f, 0.22f) * 0.4f); // #D4AF37
        mat.SetFloat("_EmissionIntensity", 0.4f);
        return mat;
    }

    public static Material CreateZoneGateMaterial()
    {
        var mat = new Material(Shader.Find("Standard"));
        mat.name = "ZoneGate";
        mat.color = new Color(1f, 0.89f, 0.71f); // #FFE4B5
        mat.EnableKeyword("_EMISSION");
        mat.SetColor("_EmissionColor", new Color(1f, 0.95f, 0.8f) * 0.5f);
        mat.SetFloat("_EmissionIntensity", 0.5f);
        mat.SetFloat("_Glossiness", 0.8f);
        return mat;
    }

    // ============================================
    // UI MATERIALS
    // ============================================

    public static Material CreateUIBackgroundMaterial()
    {
        var mat = new Material(Shader.Find("UI/Default"));
        mat.name = "UI_Background";
        mat.color = new Color(0.1f, 0.1f, 0.18f, 0.8f); // #1a1a2e
        return mat;
    }

    public static Material CreateUISurfaceMaterial()
    {
        var mat = new Material(Shader.Find("UI/Default"));
        mat.name = "UI_Surface";
        mat.color = new Color(0.086f, 0.129f, 0.243f); // #16213e
        return mat;
    }

    public static Material CreateUIAcentMaterial()
    {
        var mat = new Material(Shader.Find("UI/Default"));
        mat.name = "UI_Accent";
        mat.color = new Color(1f, 0.84f, 0f); // #FFD700
        return mat;
    }

    // ============================================
    // CLASS MATERIALS (Realm Perks)
    // ============================================

    public static Material CreateVesperMaterial() // Conjuring
    {
        var mat = new Material(Shader.Find("Standard"));
        mat.name = "Vesper_Conjuring";
        mat.color = new Color(0.6f, 0.2f, 0.8f); // #9932CC
        mat.EnableKeyword("_EMISSION");
        mat.SetColor("_EmissionColor", new Color(0.6f, 0.2f, 0.8f) * 0.4f);
        mat.SetFloat("_EmissionIntensity", 0.4f);
        return mat;
    }

    public static Material CreateTulNielohgMaterial() // Desert
    {
        var mat = new Material(Shader.Find("Standard"));
        mat.name = "TulNielohg_Desert";
        mat.color = new Color(1f, 0.27f, 0f); // #FF4500
        mat.EnableKeyword("_EMISSION");
        mat.SetColor("_EmissionColor", new Color(1f, 0.4f, 0f) * 0.5f);
        mat.SetFloat("_EmissionIntensity", 0.5f);
        return mat;
    }

    public static Material CreateNetheralmMaterial() // Dark
    {
        var mat = new Material(Shader.Find("Standard"));
        mat.name = "Netheralm_Dark";
        mat.color = new Color(0.545f, 0f, 0f); // #8B0000
        mat.EnableKeyword("_EMISSION");
        mat.SetColor("_EmissionColor", new Color(0.545f, 0f, 0f) * 0.4f);
        mat.SetFloat("_EmissionIntensity", 0.4f);
        return mat;
    }

    public static Material CreateMaginciaMaterial() // Light
    {
        var mat = new Material(Shader.Find("Standard"));
        mat.name = "Magincia_Light";
        mat.color = new Color(1f, 0.84f, 0f); // #FFD700
        mat.EnableKeyword("_EMISSION");
        mat.SetColor("_EmissionColor", new Color(1f, 0.95f, 0.5f) * 0.6f);
        mat.SetFloat("_EmissionIntensity", 0.6f);
        return mat;
    }

    // ============================================
    // BATCH CREATE ALL
    // ============================================

    public static void CreateAllMaterials()
    {
        string folder = "Assets/SoulDrifter/Materials/";
        
        // Create realm materials
        CreateAndSave(CreateFireMaterial(), folder + "Arianus_Fire.mat");
        CreateAndSave(CreateWaterMaterial(), folder + "Pryan_Water.mat");
        CreateAndSave(CreateEarthMaterial(), folder + "Chelestra_Earth.mat");
        CreateAndSave(CreateVoidMaterial(), folder + "Abarrach_Void.mat");
        
        // Create theme materials
        CreateAndSave(CreateThermalCoreMaterial(), folder + "ThermalCore.mat");
        CreateAndSave(CreateNagaCorruptionMaterial(), folder + "NagaCorruption.mat");
        CreateAndSave(CreateSartanMagicMaterial(), folder + "SartanMagic.mat");
        CreateAndSave(CreateZoneGateMaterial(), folder + "ZoneGate.mat");
        
        // Create UI materials
        CreateAndSave(CreateUIBackgroundMaterial(), folder + "UI_Background.mat");
        CreateAndSave(CreateUISurfaceMaterial(), folder + "UI_Surface.mat");
        CreateAndSave(CreateUIAcentMaterial(), folder + "UI_Accent.mat");
        
        // Create class materials
        CreateAndSave(CreateVesperMaterial(), folder + "Vesper_Conjuring.mat");
        CreateAndSave(CreateTulNielohgMaterial(), folder + "TulNielohg_Desert.mat");
        CreateAndSave(CreateNetheralmMaterial(), folder + "Netheralm_Dark.mat");
        CreateAndSave(CreateMaginciaMaterial(), folder + "Magincia_Light.mat");
        
        Debug.Log("[SoulDrifter] All materials created!");
    }

    private static void CreateAndSave(Material mat, string path)
    {
        #if UNITY_EDITOR
        if (!System.IO.Directory.Exists(System.IO.Path.GetDirectoryName(path)))
        {
            System.IO.Directory.CreateDirectory(System.IO.Path.GetDirectoryName(path));
        }
        UnityEditor.AssetDatabase.CreateAsset(mat, path);
        #endif
    }
}
