using UnityEngine;

public class Zone1Builder : MonoBehaviour
{
    [Header("Zone 1 Anchors - 70m Demo Config")]
    // Demo: Zifnab's lock (70m) - Entry→-10→-30→-50→-70
    public Vector3 entryPortal = new Vector3(0, 0, 0);
    public Vector3 entry = new Vector3(0, 0, -10);
    public Vector3 thermalDiscovery = new Vector3(0, 10, -30);  // y=10 per Edmund spec
    public Vector3 combatEncounter = new Vector3(0, 5, -50);
    public Vector3 zoneGate = new Vector3(0, 10, -70);

    [Header("Trigger Zones")]
    // Per Edmund's spec: discovery/combat/lore/gate trigger volumes
    public float thermalTriggerRadius = 15f;
    public Vector3 combatTriggerBox = new Vector3(20, 10, 20);
    public float loreTriggerRadius = 8f;
    public float gateTriggerRadius = 12f;

    [Header("Particle Effect Heights")]
    // Vertical anchor points for particle effects
    public Vector2 thermalUpdraftHeight = new Vector2(10, 25);  // rising from core
    public Vector2 windStreakHeight = new Vector2(5, 15);        // player movement
    public Vector2 corruptionHeight = new Vector2(0, 8);         // ground-hugging
    public Vector2 gateEnergyHeight = new Vector2(5, 15);       // vertical field

    [Header("Enemy Patrol")]
    // Windshear Stalker patrol waypoints (70m demo config)
    public Vector3[] patrolWaypoints = new Vector3[] {
        new Vector3(0, 8, -45),
        new Vector3(-5, 8, -55),
        new Vector3(5, 8, -55)
    };
    public Vector3 attackHoverPoint = new Vector3(0, 6, -50);

    [Header("Prefab References")]
    public GameObject skyIslandPrefab;
    public GameObject thermalVentPrefab;
    public GameObject enemyWraithPrefab;
    public GameObject loreObjectPrefab;
    public GameObject zoneGatePrefab;

    [Header("Materials")]
    public Material thermalCoreMat;
    public Material skyIslandMat;
    public Material nagaCorruptionMat;

    void Start()
    {
        BuildZone1();
    }

    public void BuildZone1()
    {
        // Entry Portal
        CreatePrimitive(PrimitiveType.Cube, entryPortal, Vector3.one * 5, "EntryPortal", skyIslandMat);

        // Entry Point (demo start)
        CreatePrimitive(PrimitiveType.Cube, entry, Vector3.one * 3, "Entry", skyIslandMat);

        // Thermal Discovery (y=10 per Edmund spec)
        CreatePrimitive(PrimitiveType.Cylinder, thermalDiscovery, Vector3.one * 4, "ThermalDiscovery", thermalCoreMat);

        // Combat Encounter (3 wraiths)
        CreatePrimitive(PrimitiveType.Cube, combatEncounter + Vector3.left * 8, Vector3.one * 2, "Wraith_1", nagaCorruptionMat);
        CreatePrimitive(PrimitiveType.Cube, combatEncounter + Vector3.right * 8, Vector3.one * 2, "Wraith_2", nagaCorruptionMat);
        CreatePrimitive(PrimitiveType.Cube, combatEncounter + Vector3.forward * 5, Vector3.one * 2, "Wraith_3", nagaCorruptionMat);

        // Zone Gate
        CreatePrimitive(PrimitiveType.Cylinder, zoneGate, new Vector3(8, 10, 1), "ZoneGate", thermalCoreMat);

        Debug.Log("Zone 1 built (70m demo): 5 anchors, 3 wraiths, 1 gate. Total depth: 70m");
    }

    GameObject CreatePrimitive(PrimitiveType type, Vector3 pos, Vector3 scale, string name, Material mat)
    {
        GameObject obj = GameObject.CreatePrimitive(type);
        obj.name = name;
        obj.transform.position = pos;
        obj.transform.localScale = scale;
        if (mat != null)
        {
            obj.GetComponent<Renderer>().material = mat;
        }
        return obj;
    }
}
