// SoulDrifterPlaceholders.cs
// Unity VR Placeholder Materials - Zone 1
// Drop in Assets/ and run to generate materials

using UnityEngine;

public static class SoulDrifterPlaceholders
{
    [UnityEditor.MenuItem("SoulDrifter/Create Placeholder Materials")]
    public static void CreateMaterials()
    {
        string matPath = "Assets/Materials/Placeholders/";

        // Thermal Core - orange/red fire
        CreateMaterial(matPath + "ThermalCore.mat", 
            new Color(1f, 0.2f, 0.2f),  // albedo
            new Color(1f, 0.4f, 0f),    // emission
            0.6f);

        // Sky Islands - pale blue/white
        CreateMaterial(matPath + "SkyIslands.mat",
            new Color(0.88f, 0.88f, 1f),  // #E0E0FF
            new Color(0.9f, 0.9f, 1f),     // slight white glow
            0.2f);

        // Naga Corruption - sickly green
        CreateMaterial(matPath + "NagaCorruption.mat",
            new Color(0f, 0.1f, 0f),      // dark
            new Color(0.22f, 1f, 0.08f),  // #39FF14
            0.3f);

        // Wind Streaks - white transparent
        CreateMaterial(matPath + "WindStreaks.mat",
            new Color(1f, 1f, 1f, 0.5f),
            new Color(1f, 1f, 1f),
            0.4f);

        // Zone Gate - golden
        CreateMaterial(matPath + "ZoneGate.mat",
            new Color(1f, 0.84f, 0f),     // gold
            new Color(1f, 0.9f, 0.5f),
            0.5f);

        // Combat Platform - dark grey
        CreateMaterial(matPath + "CombatPlatform.mat",
            new Color(0.2f, 0.2f, 0.25f),
            Color.black,
            0f);

        // Lore Artifact - cyan glow
        CreateMaterial(matPath + "LoreArtifact.mat",
            new Color(0f, 0.8f, 0.8f),
            new Color(0f, 1f, 1f),
            0.6f);

        Debug.Log("[SoulDrifter] Placeholder materials created!");
    }

    static void CreateMaterial(string path, Color albedo, Color emission, float intensity)
    {
        #if UNITY_EDITOR
        var mat = new Material(Shader.Find("Universal Render Pipeline/Lit"));
        mat.name = System.IO.Path.GetFileNameWithoutExtension(path);
        mat.color = albedo;
        mat.EnableKeyword("_EMISSION");
        mat.SetColor("_EmissionColor", emission * intensity);
        UnityEditor.AssetDatabase.CreateAsset(mat, path);
        #endif
    }
}
