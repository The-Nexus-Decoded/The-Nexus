Shader "SoulDrifter/ArianusHeatShimmer"
{
    Properties
    {
        _MainTex ("Texture", 2D) = "white" {}
        _BaseColor ("Base Color", Color) = (1,0.2,0.2,1) // #FF3333
        _GlowColor ("Glow Color", Color) = (1,0.4,0,1) // #FF6600
        _EmissionIntensity ("Emission Intensity", Range(0, 2)) = 0.5
        _ShimmerSpeed ("Shimmer Speed", Range(0, 10)) = 3.0
        _ShimmerStrength ("Shimmer Strength", Range(0, 1)) = 0.3
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" "Queue"="Geometry" }
        LOD 100

        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "UnityCG.cginc"

            struct appdata
            {
                float4 vertex : POSITION;
                float2 uv : TEXCOORD0;
            };

            struct v2f
            {
                float2 uv : TEXCOORD0;
                float4 vertex : SV_POSITION;
                float3 worldPos : TEXCOORD1;
            };

            sampler2D _MainTex;
            float4 _MainTex_ST;
            float4 _BaseColor;
            float4 _GlowColor;
            float _EmissionIntensity;
            float _ShimmerSpeed;
            float _ShimmerStrength;

            v2f vert (appdata v)
            {
                v2f o;
                // Subtle upward drift animation
                float3 pos = v.vertex.xyz;
                pos.y += sin(_Time.y * 2.0 + pos.x * 0.5) * _ShimmerStrength * 0.02;
                v.vertex.xyz = pos;
                
                o.vertex = UnityObjectToClipPos(v.vertex);
                o.uv = TRANSFORM_TEX(v.uv, _MainTex);
                o.worldPos = mul(unity_ObjectToWorld, v.vertex).xyz;
                return o;
            }

            fixed4 frag (v2f i) : SV_Target
            {
                // Heat shimmer effect
                float shimmer = sin(i.uv.y * 10.0 - _Time.y * _ShimmerSpeed) * 0.5 + 0.5;
                
                // Edge glow
                float edgeX = smoothstep(0.0, 0.3, i.uv.x) * smoothstep(0.0, 0.3, 1.0 - i.uv.x);
                float edgeY = smoothstep(0.0, 0.3, i.uv.y) * smoothstep(0.0, 0.3, 1.0 - i.uv.y);
                float edge = 1.0 - (edgeX * edgeY);
                
                // Mix base and glow colors
                fixed4 col = lerp(_BaseColor, _GlowColor, shimmer * edge);
                
                // Add emission
                col.rgb += _GlowColor.rgb * _EmissionIntensity * edge * shimmer;
                
                return col;
            }
            ENDCG
        }
    }
}

// ============================================
// PRYAN WATER SHADER
// ============================================

Shader "SoulDrifter/PryanDropletTrail"
{
    Properties
    {
        _MainTex ("Texture", 2D) = "white" {}
        _BaseColor ("Base Color", Color) = (0.2,0.2,1,1) // #3333FF
        _HighlightColor ("Highlight Color", Color) = (0.4,0.67,1,1) // #66AAFF
        _EmissionIntensity ("Emission Intensity", Range(0, 2)) = 0.3
        _SpiralSpeed ("Spiral Speed", Range(0, 10)) = 4.0
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" "Queue"="Geometry" }
        LOD 100

        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "UnityCG.cginc"

            struct appdata
            {
                float4 vertex : POSITION;
                float2 uv : TEXCOORD0;
            };

            struct v2f
            {
                float2 uv : TEXCOORD0;
                float4 vertex : SV_POSITION;
                float2 center : TEXCOORD1;
            };

            sampler2D _MainTex;
            float4 _MainTex_ST;
            float4 _BaseColor;
            float4 _HighlightColor;
            float _EmissionIntensity;
            float _SpiralSpeed;

            v2f vert (appdata v)
            {
                v2f o;
                o.vertex = UnityObjectToClipPos(v.vertex);
                o.uv = TRANSFORM_TEX(v.uv, _MainTex);
                o.center = v.uv - 0.5;
                return o;
            }

            fixed4 frag (v2f i) : SV_Target
            {
                // Spiral UV offset
                float angle = atan2(i.center.y, i.center.x);
                float radius = length(i.center);
                
                float spiral = sin(angle * 3.0 + radius * 20.0 - _Time.y * _SpiralSpeed);
                
                // Droplet highlights
                float highlight = smoothstep(0.3, 0.0, radius) * (spiral * 0.5 + 0.5);
                
                fixed4 col = lerp(_BaseColor, _HighlightColor, highlight);
                col.rgb += _HighlightColor.rgb * _EmissionIntensity * highlight;
                
                return col;
            }
            ENDCG
        }
    }
}

// ============================================
// CHELESTRA EARTH SHADER
// ============================================

Shader "SoulDrifter/ChelestraGroundVibration"
{
    Properties
    {
        _MainTex ("Texture", 2D) = "white" {}
        _BaseColor ("Base Color", Color) = (0.2,1,0.2,1) // #33FF33
        _PulseColor ("Pulse Color", Color) = (0.4,1,0.4,1) // #66FF66
        _EmissionIntensity ("Emission Intensity", Range(0, 2)) = 0.2
        _PulseSpeed ("Pulse Speed", Range(0, 5)) = 2.0
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" "Queue"="Geometry" }
        LOD 100

        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "UnityCG.cginc"

            struct appdata
            {
                float4 vertex : POSITION;
                float2 uv : TEXCOORD0;
            };

            struct v2f
            {
                float2 uv : TEXCOORD0;
                float4 vertex : SV_POSITION;
            };

            sampler2D _MainTex;
            float4 _MainTex_ST;
            float4 _BaseColor;
            float4 _PulseColor;
            float _EmissionIntensity;
            float _PulseSpeed;

            v2f vert (appdata v)
            {
                v2f o;
                // Ground vibration
                float3 pos = v.vertex.xyz;
                float vibrate = sin(_Time.y * 15.0) * 0.005;
                pos.x += vibrate;
                pos.z += vibrate;
                v.vertex.xyz = pos;
                
                o.vertex = UnityObjectToClipPos(v.vertex);
                o.uv = TRANSFORM_TEX(v.uv, _MainTex);
                return o;
            }

            fixed4 frag (v2f i) : SV_Target
            {
                // Slow pulse
                float pulse = sin(_Time.y * _PulseSpeed) * 0.5 + 0.5;
                
                // Simple noise
                float noise = frac(sin(dot(i.uv * 50.0, float2(12.9898, 78.233))) * 43758.5453);
                
                fixed4 col = lerp(_BaseColor, _PulseColor, pulse * 0.3);
                col.rgb += noise * 0.05;
                col.rgb += _PulseColor.rgb * _EmissionIntensity * pulse * 0.3;
                
                return col;
            }
            ENDCG
        }
    }
}

// ============================================
// ABARRACH VOID SHADER
// ============================================

Shader "SoulDrifter/AbarrachGlowFlicker"
{
    Properties
    {
        _MainTex ("Texture", 2D) = "white" {}
        _BaseColor ("Base Color", Color) = (0,0,0,1) // #000000
        _GlowColor ("Glow Color", Color) = (0.1,0.1,0.18,1) // #1a1a2e
        _EmissionIntensity ("Emission Intensity", Range(0, 2)) = 0.4
        _FlickerSpeed ("Flicker Speed", Range(0, 20)) = 10.0
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" "Queue"="Geometry" }
        LOD 100

        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "UnityCG.cginc"

            struct appdata
            {
                float4 vertex : POSITION;
                float2 uv : TEXCOORD0;
            };

            struct v2f
            {
                float2 uv : TEXCOORD0;
                float4 vertex : SV_POSITION;
            };

            sampler2D _MainTex;
            float4 _MainTex_ST;
            float4 _BaseColor;
            float4 _GlowColor;
            float _EmissionIntensity;
            float _FlickerSpeed;

            // Simple hash for noise
            float hash(float2 st)
            {
                return frac(sin(dot(st.xy, float2(12.9898, 78.233))) * 43758.5453123);
            }

            v2f vert (appdata v)
            {
                v2f o;
                o.vertex = UnityObjectToClipPos(v.vertex);
                o.uv = TRANSFORM_TEX(v.uv, _MainTex);
                return o;
            }

            fixed4 frag (v2f i) : SV_Target
            {
                // Flicker pattern
                float flicker = hash(float2(_Time.y * _FlickerSpeed, 0.0));
                flicker = smoothstep(0.3, 0.7, flicker);
                
                // Edge glow
                float edgeX = smoothstep(0.2, 0.5, i.uv.x) * smoothstep(0.2, 0.5, 1.0 - i.uv.x);
                float edgeY = smoothstep(0.2, 0.5, i.uv.y) * smoothstep(0.2, 0.5, 1.0 - i.uv.y);
                float edge = 1.0 - (edgeX * edgeY);
                
                fixed4 col = lerp(_BaseColor, _GlowColor, edge * flicker);
                col.rgb += _GlowColor.rgb * _EmissionIntensity * edge * flicker;
                col.a = 0.4 + edge * flicker * 0.4;
                
                return col;
            }
            ENDCG
        }
    }
}
