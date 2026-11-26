// ============================================================================
// ShadowRealm 3D — v3.0 "Ascendant" (Desktop OpenGL 3.3 Core Edition)
// Stack: C++17 · OpenGL 3.3 Core · GLAD · GLFW · GLM · Dear ImGui · Causality v2
// ============================================================================

#include <glad/gl.h>
#include <GLFW/glfw3.h>

#include <glm/glm.hpp>
#include <glm/gtc/matrix_transform.hpp>
#include <glm/gtc/type_ptr.hpp>

#include "imgui.h"
#include "imgui_impl_glfw.h"
#include "imgui_impl_opengl3.h"

#include "Causality.h"

#include <algorithm>
#include <cmath>
#include <cstdio>
#include <cstring>
#include <deque>
#include <random>
#include <string>
#include <vector>

namespace {

constexpr int kWindowWidth = 1280;
constexpr int kWindowHeight = 720;
constexpr float kDayCycleSeconds = 120.0f;
constexpr float kGravity = -24.0f;
constexpr float kJumpVel = 10.5f;
constexpr int kMaxParticles = 600;

enum StatusFlags : unsigned int {
    STATUS_NONE = 0,
    STATUS_BURN = 1u << 0,
    STATUS_FREEZE = 1u << 1,
    STATUS_POISON = 1u << 2,
    STATUS_STUN = 1u << 3
};

enum class PlayerClass { Knight = 0, Mage = 1, Rogue = 2, Shaman = 3 };
enum class EnemyKind { Wolf = 0, Goblin = 1, Shade = 2, Boss = 3 };
enum class AIState { Idle, Patrol, Chase, Attack, Flee };
enum class GameScreen { ClassSelect, Playing, Paused };

struct ClassSpec {
    const char* name;
    const char* powerName;
    float maxHp;
    float maxStamina;
    int str;
    int def;
    int agi;
    float speed;
    unsigned int powerStatus;
    glm::vec3 color;
};

constexpr ClassSpec kClassSpecs[4] = {
    {"Knight", "Aegis Cleave", 160.f, 110.f, 22, 16, 8, 8.6f, STATUS_STUN, {0.88f, 0.65f, 0.20f}},
    {"Mage", "Frostfire Nova", 115.f, 120.f, 30, 8, 12, 9.2f, STATUS_FREEZE | STATUS_BURN, {0.25f, 0.68f, 0.96f}},
    {"Rogue", "Venom Flurry", 125.f, 135.f, 25, 10, 20, 10.8f, STATUS_POISON, {0.26f, 0.85f, 0.48f}},
    {"Shaman", "Cinder Totem", 140.f, 115.f, 26, 12, 14, 9.5f, STATUS_BURN, {0.96f, 0.52f, 0.22f}},
};

struct NftItem {
    std::string name;
    int rarity = 0; // 0..5 (Common..Mythic)
    int strBonus = 0;
    int defBonus = 0;
    int ccValue = 0;
    bool equipped = false;
};

struct Enemy {
    EnemyKind kind = EnemyKind::Wolf;
    std::string name;
    int level = 1;
    glm::vec3 pos{0.0f};
    glm::vec3 spawnPos{0.0f};
    glm::vec3 patrolTarget{0.0f};
    float patrolTimer = 2.0f;
    float hp = 60.0f;
    float maxHp = 60.0f;
    float attack = 12.0f;
    float speed = 5.0f;
    float attackRange = 2.6f;
    float fleeHpPct = 0.05f;
    float attackCd = 0.0f;
    AIState state = AIState::Patrol;
    unsigned int statusMask = STATUS_NONE;
    float statusTimer = 0.0f;
    bool alive = true;
};

struct Particle {
    glm::vec3 pos{0.0f};
    glm::vec3 vel{0.0f};
    glm::vec3 color{1.0f};
    float life = 0.0f;
    float size = 0.25f;
};

struct WorldProp {
    glm::vec3 pos{0.0f};
    glm::vec3 scale{1.0f};
    glm::vec3 color{0.3f, 0.5f, 0.3f};
    bool isMushroom = false;
};

struct MainUniforms {
    GLint uMVP = -1;
    GLint uModel = -1;
    GLint uColor = -1;
    GLint uLightDir = -1;
    GLint uViewPos = -1;
    GLint uZoneTint = -1;
    GLint uAmbient = -1;
    GLint uFogColor = -1;
};

struct GameState {
    GameScreen screen = GameScreen::ClassSelect;
    char playerName[32] = "Ascendant";
    PlayerClass playerClass = PlayerClass::Knight;

    glm::vec3 playerPos{0.0f, 1.0f, 12.0f};
    float playerYaw = 3.14159f;
    float velY = 0.0f;
    bool onGround = true;
    bool flyMode = false;

    int level = 1;
    int xp = 0;
    int xpToNext = 100;
    float hp = 160.0f;
    float maxHp = 160.0f;
    float stamina = 110.0f;
    float maxStamina = 110.0f;
    int gold = 75;
    int cc = 25;
    int kills = 0;
    int deaths = 0;
    int streak = 0;
    int bestStreak = 0;
    int comboCount = 0;
    float comboTimer = 0.0f;
    int reviveTokens = 1;

    int domainLevel = 1;
    float domainActiveTimer = 0.0f;
    float domainCd = 0.0f;
    bool nukeUnlocked = false;
    float nukeCd = 0.0f;

    float attackCd = 0.0f;
    float powerCd = 0.0f;
    float healCd = 0.0f;
    float dashCd = 0.0f;
    float ccMultTimer = 0.0f;
    float essenceBuffTimer = 0.0f;

    float dayTime = 20.0f;
    bool showMenu = false;
    bool showDebug = false;
    int fpsCap = 60; // 0 = uncapped

    float camYaw = 0.0f;
    float camPitch = 0.28f;
    float camDist = 11.0f;
    bool rmbDown = false;
    double lastMouseX = 0.0;
    double lastMouseY = 0.0;

    std::vector<Enemy> enemies;
    std::vector<NftItem> nfts;
    std::deque<Particle> particles;
    std::vector<WorldProp> props;
    std::deque<std::string> log;
    causality::Engine<GameState> causalityEngine;
    std::mt19937 rng{4242};

    void addLog(const std::string& msg) {
        log.push_front(msg);
        if (log.size() > 24) log.pop_back();
    }

    float randf(float lo, float hi) {
        std::uniform_real_distribution<float> dist(lo, hi);
        return dist(rng);
    }

    bool isNight() const {
        float t = std::fmod(dayTime, kDayCycleSeconds);
        return t >= 66.0f && t < 114.0f;
    }

    int totalStr() const {
        const auto& spec = kClassSpecs[static_cast<int>(playerClass)];
        int s = spec.str + (level - 1) * 3 + (essenceBuffTimer > 0.0f ? 10 : 0);
        for (const auto& item : nfts) if (item.equipped) s += item.strBonus;
        return s;
    }

    int totalDef() const {
        const auto& spec = kClassSpecs[static_cast<int>(playerClass)];
        int d = spec.def + (level - 1) * 2;
        for (const auto& item : nfts) if (item.equipped) d += item.defBonus;
        return d;
    }

    int totalAgi() const {
        const auto& spec = kClassSpecs[static_cast<int>(playerClass)];
        return spec.agi + (level - 1) + (essenceBuffTimer > 0.0f ? 5 : 0);
    }

    float domainRange() const {
        return std::min(80.0f, 12.0f + static_cast<float>(domainLevel - 1) * 0.5f);
    }

    int aliveEnemies() const {
        int count = 0;
        for (const auto& e : enemies) if (e.alive) ++count;
        return count;
    }

    float nearestBossDist() const {
        float best = 9999.0f;
        for (const auto& e : enemies) {
            if (e.alive && e.kind == EnemyKind::Boss) {
                best = std::min(best, glm::length(e.pos - playerPos));
            }
        }
        return best;
    }
};

float terrainHeight(float x, float z) {
    float h = std::sin(x * 0.06f) * std::cos(z * 0.06f) * 1.8f +
              std::sin(x * 0.14f + 1.0f) * std::sin(z * 0.12f) * 0.6f;
    float spawnDist = std::hypot(x, z - 12.0f);
    if (spawnDist < 12.0f) {
        h *= (spawnDist / 12.0f);
    }
    return h;
}

const char* zoneNameAt(const glm::vec3& pos) {
    float r = std::hypot(pos.x, pos.z);
    if (r < 32.0f) return "Shadow Forest";
    if (r < 54.0f) return "Ashen Desert";
    if (r < 76.0f) return "Obsidian Mountains";
    return "Cursed Wastes";
}

glm::vec3 zoneTintAt(const glm::vec3& pos) {
    float r = std::hypot(pos.x, pos.z);
    if (r < 32.0f) return {0.88f, 1.00f, 0.92f};
    if (r < 54.0f) return {1.06f, 0.94f, 0.80f};
    if (r < 76.0f) return {0.86f, 0.88f, 1.02f};
    return {1.05f, 0.78f, 0.96f};
}

void spawnParticles(GameState& g, const glm::vec3& origin, const glm::vec3& color, int count) {
    for (int i = 0; i < count; ++i) {
        Particle p;
        p.pos = origin;
        p.vel = {g.randf(-4.5f, 4.5f), g.randf(2.0f, 7.5f), g.randf(-4.5f, 4.5f)};
        p.color = color;
        p.life = g.randf(0.35f, 0.85f);
        p.size = g.randf(0.14f, 0.30f);
        g.particles.push_back(p);
        while (static_cast<int>(g.particles.size()) > kMaxParticles) {
            g.particles.pop_front();
        }
    }
}

NftItem generateNft(GameState& g, int forcedRarity = -1) {
    static const char* kRarityNames[6] = {"Common", "Uncommon", "Rare", "Epic", "Legendary", "Mythic"};
    static const char* kGearNames[4] = {"Reaper", "Aegis", "Crown", "Sigil"};
    int rarity = forcedRarity;
    if (rarity < 0) {
        float roll = g.randf(0.0f, 1.0f);
        if (roll > 0.98f) rarity = 5;
        else if (roll > 0.92f) rarity = 4;
        else if (roll > 0.80f) rarity = 3;
        else if (roll > 0.60f) rarity = 2;
        else if (roll > 0.35f) rarity = 1;
        else rarity = 0;
    }
    int mult = 1 << rarity;
    int idx = static_cast<int>(g.randf(0.0f, 3.99f));
    NftItem item;
    item.rarity = rarity;
    item.name = std::string(kRarityNames[rarity]) + " " + kGearNames[idx];
    item.strBonus = 4 * mult;
    item.defBonus = 2 * mult;
    item.ccValue = 18 * mult;
    return item;
}

void spawnEnemy(GameState& g, EnemyKind kind) {
    Enemy e;
    e.kind = kind;
    int delta = static_cast<int>(std::round(g.randf(-1.5f, 1.5f)));
    e.level = std::max(1, g.level + delta + (kind == EnemyKind::Boss ? 2 : 0));
    float scale = 1.0f + static_cast<float>(e.level - 1) * 0.16f;

    float angle = g.randf(0.0f, 6.28318f);
    float radius = g.randf(18.0f, 46.0f);
    e.pos = {std::cos(angle) * radius, 0.0f, std::sin(angle) * radius};
    e.pos.y = terrainHeight(e.pos.x, e.pos.z) + 0.9f;
    e.spawnPos = e.pos;
    e.patrolTarget = e.pos;

    switch (kind) {
        case EnemyKind::Wolf:
            e.name = "Shadow Wolf";
            e.maxHp = 58.0f * scale;
            e.attack = 12.0f * scale;
            e.speed = 6.2f;
            e.attackRange = 2.5f;
            e.fleeHpPct = 0.05f;
            break;
        case EnemyKind::Goblin:
            e.name = "Rift Goblin";
            e.maxHp = 76.0f * scale;
            e.attack = 15.0f * scale;
            e.speed = 4.9f;
            e.attackRange = 2.9f;
            e.fleeHpPct = 0.12f;
            break;
        case EnemyKind::Shade:
            e.name = "Void Shade";
            e.maxHp = 64.0f * scale;
            e.attack = 17.0f * scale;
            e.speed = 4.5f;
            e.attackRange = 16.0f;
            e.fleeHpPct = 0.30f;
            break;
        case EnemyKind::Boss:
            e.name = "Shadow King";
            e.maxHp = 360.0f * scale;
            e.attack = 28.0f * scale;
            e.speed = 4.2f;
            e.attackRange = 4.6f;
            e.fleeHpPct = 0.0f;
            break;
    }
    e.hp = e.maxHp;
    g.enemies.push_back(e);
}

void topUpEnemies(GameState& g, int targetCount, bool includeBoss) {
    int needed = std::max(0, targetCount - g.aliveEnemies());
    for (int i = 0; i < needed; ++i) {
        float roll = g.randf(0.0f, 1.0f);
        EnemyKind kind = roll < 0.42f ? EnemyKind::Wolf
                       : roll < 0.76f ? EnemyKind::Goblin
                                      : EnemyKind::Shade;
        spawnEnemy(g, kind);
    }
    if (includeBoss && g.nearestBossDist() > 5000.0f) {
        spawnEnemy(g, EnemyKind::Boss);
    }
}

void registerCausalityRules(GameState& g) {
    using Ctx = GameState;
    g.causalityEngine = causality::Engine<Ctx>{};

    g.causalityEngine.addRule({
        "unlock_nuke", "Level>=5 AND Kills>=10 -> Unlock Teraton Bomb",
        causality::LogicOp::AND, 10,
        {[](const Ctx& c) { return c.level >= 5; },
         [](const Ctx& c) { return c.kills >= 10; },
         causality::NOT<Ctx>([](const Ctx& c) { return c.nukeUnlocked; })},
        [](Ctx& c) {
            c.nukeUnlocked = true;
            c.addLog("[Causality] Teraton Bomb unlocked! Press [N].");
        },
        1, 0.0f
    });

    g.causalityEngine.addRule({
        "low_hp_warn", "HP < 20% -> Low Vitality Warning",
        causality::LogicOp::AND, 9,
        {[](const Ctx& c) { return c.hp > 0.0f && (c.hp / c.maxHp) < 0.20f; }},
        [](Ctx& c) { c.addLog("[Causality] Critical Vitality (<20%) — press [C] to Heal!"); },
        0, 5.0f
    });

    g.causalityEngine.addRule({
        "on_fire", "Streak>=5 -> Kill Streak CC Bonus",
        causality::LogicOp::AND, 8,
        {[](const Ctx& c) { return c.streak >= 5; }},
        [](Ctx& c) {
            int bonus = c.ccMultTimer > 0.0f ? 50 : 25;
            c.cc += bonus;
            c.addLog("[Causality] ON FIRE! +" + std::to_string(bonus) + " CC");
        },
        0, 8.0f
    });

    g.causalityEngine.addRule({
        "boss_alert", "Boss alive AND within 20u -> Boss Alert",
        causality::LogicOp::AND, 8,
        {[](const Ctx& c) { return c.nearestBossDist() <= 20.0f; }},
        [](Ctx& c) { c.addLog("[Causality] ALERT: Shadow King within 20u!"); },
        1, 0.0f
    });

    g.causalityEngine.addRule({
        "cc_airdrop", "CC>=200 -> Epic NFT Airdrop",
        causality::LogicOp::AND, 7,
        {[](const Ctx& c) { return c.cc >= 200; }},
        [](Ctx& c) {
            NftItem drop = generateNft(c, 3);
            c.addLog("[Causality] 200 CC Milestone Airdrop: " + drop.name);
            c.nfts.push_back(drop);
        },
        1, 0.0f
    });

    g.causalityEngine.addRule({
        "boss_wave", "Level>=10 OR Deaths>=3 -> Summon Shadow King",
        causality::LogicOp::OR, 6,
        {[](const Ctx& c) { return c.level >= 10; },
         [](const Ctx& c) { return c.deaths >= 3; }},
        [](Ctx& c) {
            topUpEnemies(c, 10, true);
            c.addLog("[Causality] Boss Wave: Shadow King enters the realm!");
        },
        0, 30.0f
    });

    g.causalityEngine.addRule({
        "wave_respawn", "All enemies dead -> Respawn wave + 40 Gold",
        causality::LogicOp::AND, 5,
        {[](const Ctx& c) { return c.aliveEnemies() == 0; }},
        [](Ctx& c) {
            c.gold += 40;
            topUpEnemies(c, 10, c.level >= 4);
            c.addLog("[Causality] Wave cleared (+40G). Fresh enemies spawned.");
        },
        0, 4.0f
    });

    g.causalityEngine.addRule({
        "nuke_ready", "Nuke CD=0 AND Level>=3 -> Reminder",
        causality::LogicOp::AND, 4,
        {[](const Ctx& c) { return c.nukeUnlocked && c.nukeCd <= 0.0f && c.level >= 3; }},
        [](Ctx& c) { c.addLog("[Causality] Teraton Bomb is ready [N]."); },
        5, 20.0f
    });

    g.causalityEngine.addRule({
        "absorb_evolve", "DomainLv>=50 AND Kills>=50 -> +500 MaxHP",
        causality::LogicOp::AND, 3,
        {[](const Ctx& c) { return c.domainLevel >= 50 && c.kills >= 50; }},
        [](Ctx& c) {
            c.maxHp += 500.0f;
            c.hp = c.maxHp;
            c.addLog("[Causality] Absorb Evolve! +500 Max HP.");
        },
        1, 0.0f
    });

    g.causalityEngine.addRule({
        "night_warn", "Night time -> Enemies grow stronger",
        causality::LogicOp::AND, 2,
        {[](const Ctx& c) { return c.isNight(); }},
        [](Ctx& c) { c.addLog("[Causality] Night falls — enemies grow faster and deadlier."); },
        3, 45.0f
    });
}

void grantXp(GameState& g, int amount) {
    g.xp += amount;
    while (g.xp >= g.xpToNext) {
        g.xp -= g.xpToNext;
        g.level += 1;
        g.xpToNext = static_cast<int>(100.0f * std::pow(1.22f, static_cast<float>(g.level - 1)));
        g.maxHp += 18.0f;
        g.hp = g.maxHp;
        g.stamina = g.maxStamina;
        g.domainLevel = std::min(999, g.domainLevel + 2);
        g.addLog("LEVEL UP! Reached Lv." + std::to_string(g.level));
    }
}

void damageEnemy(GameState& g, Enemy& e, float dmg, bool crit, unsigned int status) {
    if (!e.alive) return;
    e.hp = std::max(0.0f, e.hp - dmg);
    if (status != STATUS_NONE) {
        e.statusMask |= status;
        e.statusTimer = std::max(e.statusTimer, 3.5f);
    }
    g.comboCount += 1;
    g.comboTimer = 2.5f;
    spawnParticles(g, e.pos, crit ? glm::vec3{1.0f, 0.72f, 0.18f} : glm::vec3{0.92f, 0.22f, 0.25f}, crit ? 14 : 6);

    if (e.hp <= 0.0f) {
        e.alive = false;
        g.kills += 1;
        g.streak += 1;
        g.bestStreak = std::max(g.bestStreak, g.streak);
        int xpGain = e.kind == EnemyKind::Boss ? 140 : 28 + e.level * 6;
        int goldGain = e.kind == EnemyKind::Boss ? 95 : 14 + e.level * 3;
        int baseCc = e.kind == EnemyKind::Boss ? 50 : 9 + e.level * 2;
        int ccGain = g.ccMultTimer > 0.0f ? baseCc * 2 : baseCc;
        g.gold += goldGain;
        g.cc += ccGain;
        g.domainLevel = std::min(999, g.domainLevel + (e.kind == EnemyKind::Boss ? 5 : 1));
        grantXp(g, xpGain);
        g.addLog(e.name + " defeated! +" + std::to_string(xpGain) + "XP +" + std::to_string(ccGain) + "CC");

        float dropChance = e.kind == EnemyKind::Boss ? 0.90f
                         : e.kind == EnemyKind::Shade ? 0.40f
                         : e.kind == EnemyKind::Goblin ? 0.35f : 0.20f;
        if (g.randf(0.0f, 1.0f) < dropChance) {
            NftItem drop = generateNft(g, e.kind == EnemyKind::Boss ? 4 : -1);
            g.addLog("NFT DROP: " + drop.name + " (+" + std::to_string(drop.strBonus) + " STR)");
            g.nfts.push_back(drop);
        }
    }
}

void startGameWithClass(GameState& g, PlayerClass cls) {
    g.playerClass = cls;
    const auto& spec = kClassSpecs[static_cast<int>(cls)];
    g.level = 1;
    g.xp = 0;
    g.xpToNext = 100;
    g.maxHp = spec.maxHp;
    g.hp = spec.maxHp;
    g.maxStamina = spec.maxStamina;
    g.stamina = spec.maxStamina;
    g.gold = 75;
    g.cc = 25;
    g.kills = 0;
    g.deaths = 0;
    g.streak = 0;
    g.comboCount = 0;
    g.comboTimer = 0.0f;
    g.reviveTokens = 1;
    g.domainLevel = 1;
    g.domainActiveTimer = 0.0f;
    g.domainCd = 0.0f;
    g.nukeUnlocked = false;
    g.nukeCd = 0.0f;
    g.playerPos = {0.0f, terrainHeight(0.0f, 12.0f) + 0.9f, 12.0f};
    g.enemies.clear();
    g.nfts.clear();
    g.nfts.push_back(generateNft(g, 1));
    topUpEnemies(g, 10, false);
    g.causalityEngine.reset();
    g.log.clear();
    g.addLog(std::string(g.playerName) + " (" + spec.name + ") enters ShadowRealm 3D v3.0.");
    g.screen = GameScreen::Playing;
}

const char* kVertShaderSrc = R"(
#version 330 core
layout (location = 0) in vec3 aPos;
layout (location = 1) in vec3 aNormal;
uniform mat4 uMVP;
uniform mat4 uModel;
out vec3 vNormal;
out vec3 vFragPos;
void main() {
    vFragPos = vec3(uModel * vec4(aPos, 1.0));
    vNormal = mat3(transpose(inverse(uModel))) * aNormal;
    gl_Position = uMVP * vec4(aPos, 1.0);
}
)";

const char* kFragShaderSrc = R"(
#version 330 core
in vec3 vNormal;
in vec3 vFragPos;
uniform vec3 uColor;
uniform vec3 uLightDir;
uniform vec3 uViewPos;
uniform vec3 uZoneTint;
uniform float uAmbient;
uniform vec3 uFogColor;
out vec4 FragColor;
void main() {
    vec3 N = normalize(vNormal);
    vec3 L = normalize(uLightDir);
    vec3 V = normalize(uViewPos - vFragPos);
    vec3 H = normalize(L + V);
    float diff = max(dot(N, L), 0.0);
    float spec = pow(max(dot(N, H), 0.0), 32.0) * 0.25;
    vec3 lit = (uAmbient + diff * 0.85) * uColor * uZoneTint + vec3(spec);
    float dist = length(uViewPos - vFragPos);
    float fogFactor = clamp(exp(-dist * 0.011), 0.0, 1.0);
    vec3 finalColor = mix(uFogColor, lit, fogFactor);
    FragColor = vec4(finalColor, 1.0);
}
)";

GLuint compileShader(GLenum type, const char* src) {
    GLuint s = glCreateShader(type);
    glShaderSource(s, 1, &src, nullptr);
    glCompileShader(s);
    GLint ok = 0;
    glGetShaderiv(s, GL_COMPILE_STATUS, &ok);
    if (!ok) {
        char info[512];
        glGetShaderInfoLog(s, sizeof(info), nullptr, info);
        std::fprintf(stderr, "Shader error: %s\n", info);
    }
    return s;
}

GLuint createCubeVao() {
    static const float verts[] = {
        // pos               normal
        -0.5f,-0.5f, 0.5f,   0, 0, 1,   0.5f,-0.5f, 0.5f,  0, 0, 1,   0.5f, 0.5f, 0.5f,  0, 0, 1,
        -0.5f,-0.5f, 0.5f,   0, 0, 1,   0.5f, 0.5f, 0.5f,  0, 0, 1,  -0.5f, 0.5f, 0.5f,  0, 0, 1,
        -0.5f,-0.5f,-0.5f,   0, 0,-1,  -0.5f, 0.5f,-0.5f,  0, 0,-1,   0.5f, 0.5f,-0.5f,  0, 0,-1,
        -0.5f,-0.5f,-0.5f,   0, 0,-1,   0.5f, 0.5f,-0.5f,  0, 0,-1,   0.5f,-0.5f,-0.5f,  0, 0,-1,
        -0.5f, 0.5f,-0.5f,   0, 1, 0,  -0.5f, 0.5f, 0.5f,  0, 1, 0,   0.5f, 0.5f, 0.5f,  0, 1, 0,
        -0.5f, 0.5f,-0.5f,   0, 1, 0,   0.5f, 0.5f, 0.5f,  0, 1, 0,   0.5f, 0.5f,-0.5f,  0, 1, 0,
        -0.5f,-0.5f,-0.5f,   0,-1, 0,   0.5f,-0.5f,-0.5f,  0,-1, 0,   0.5f,-0.5f, 0.5f,  0,-1, 0,
        -0.5f,-0.5f,-0.5f,   0,-1, 0,   0.5f,-0.5f, 0.5f,  0,-1, 0,  -0.5f,-0.5f, 0.5f,  0,-1, 0,
         0.5f,-0.5f,-0.5f,   1, 0, 0,   0.5f, 0.5f,-0.5f,  1, 0, 0,   0.5f, 0.5f, 0.5f,  1, 0, 0,
         0.5f,-0.5f,-0.5f,   1, 0, 0,   0.5f, 0.5f, 0.5f,  1, 0, 0,   0.5f,-0.5f, 0.5f,  1, 0, 0,
        -0.5f,-0.5f,-0.5f,  -1, 0, 0,  -0.5f,-0.5f, 0.5f, -1, 0, 0,  -0.5f, 0.5f, 0.5f, -1, 0, 0,
        -0.5f,-0.5f,-0.5f,  -1, 0, 0,  -0.5f, 0.5f, 0.5f, -1, 0, 0,  -0.5f, 0.5f,-0.5f, -1, 0, 0,
    };
    GLuint vao = 0, vbo = 0;
    glGenVertexArrays(1, &vao);
    glGenBuffers(1, &vbo);
    glBindVertexArray(vao);
    glBindBuffer(GL_ARRAY_BUFFER, vbo);
    glBufferData(GL_ARRAY_BUFFER, sizeof(verts), verts, GL_STATIC_DRAW);
    glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 6 * sizeof(float), nullptr);
    glEnableVertexAttribArray(0);
    glVertexAttribPointer(1, 3, GL_FLOAT, GL_FALSE, 6 * sizeof(float), reinterpret_cast<void*>(3 * sizeof(float)));
    glEnableVertexAttribArray(1);
    glBindVertexArray(0);
    return vao;
}

void drawBox(const MainUniforms& uni, GLuint cubeVao, const glm::mat4& vp,
             const glm::vec3& pos, const glm::vec3& scale, const glm::vec3& color) {
    glm::mat4 model = glm::translate(glm::mat4(1.0f), pos);
    model = glm::scale(model, scale);
    glm::mat4 mvp = vp * model;
    glUniformMatrix4fv(uni.uMVP, 1, GL_FALSE, glm::value_ptr(mvp));
    glUniformMatrix4fv(uni.uModel, 1, GL_FALSE, glm::value_ptr(model));
    glUniform3fv(uni.uColor, 1, glm::value_ptr(color));
    glBindVertexArray(cubeVao);
    glDrawArrays(GL_TRIANGLES, 0, 36);
}

void populateWorldProps(GameState& g) {
    g.props.clear();
    // Trees & rocks
    for (int i = 0; i < 90; ++i) {
        float ang = g.randf(0.0f, 6.28318f);
        float rad = g.randf(12.0f, 68.0f);
        float x = std::cos(ang) * rad;
        float z = std::sin(ang) * rad;
        float y = terrainHeight(x, z);
        if (i % 4 == 0) {
            // Mushroom world object (4th type)
            g.props.push_back({{x, y + 0.6f, z}, {0.35f, 1.2f, 0.35f}, {0.85f, 0.80f, 0.78f}, true});
            g.props.push_back({{x, y + 1.3f, z}, {1.2f, 0.45f, 1.2f}, {0.68f, 0.28f, 0.92f}, true});
        } else {
            g.props.push_back({{x, y + 1.5f, z}, {0.55f, 3.0f, 0.55f}, {0.26f, 0.18f, 0.14f}, false});
            g.props.push_back({{x, y + 3.6f, z}, {2.2f, 2.6f, 2.2f}, {0.16f, 0.38f, 0.28f}, false});
        }
    }
}

void renderImGui(GameState& g) {
    if (g.screen == GameScreen::ClassSelect) {
        ImGui::SetNextWindowPos({40, 40}, ImGuiCond_Always);
        ImGui::SetNextWindowSize({400, 360}, ImGuiCond_Always);
        ImGui::Begin("ShadowRealm 3D v3.0 — Ascendant", nullptr, ImGuiWindowFlags_NoResize | ImGuiWindowFlags_NoCollapse);
        ImGui::InputText("Hero Name", g.playerName, sizeof(g.playerName));
        ImGui::Separator();
        ImGui::Text("Select Class:");
        int selected = static_cast<int>(g.playerClass);
        for (int i = 0; i < 4; ++i) {
            if (ImGui::RadioButton(kClassSpecs[i].name, selected == i)) {
                selected = i;
                g.playerClass = static_cast<PlayerClass>(i);
            }
            ImGui::SameLine();
            ImGui::TextDisabled("HP %.0f | STR %d | %s", kClassSpecs[i].maxHp, kClassSpecs[i].str, kClassSpecs[i].powerName);
        }
        ImGui::Spacing();
        if (ImGui::Button("Enter ShadowRealm", {-1.0f, 40.0f})) {
            startGameWithClass(g, g.playerClass);
        }
        ImGui::End();
        return;
    }

    // Compact Top-Left HUD
    ImGui::SetNextWindowPos({16, 16}, ImGuiCond_Always);
    ImGui::SetNextWindowSize({300, 175}, ImGuiCond_Always);
    ImGui::Begin("Hero HUD", nullptr, ImGuiWindowFlags_NoTitleBar | ImGuiWindowFlags_NoResize);
    ImGui::Text("%s  Lv.%d (%s)", g.playerName, g.level, kClassSpecs[static_cast<int>(g.playerClass)].name);
    ImGui::TextDisabled("%s | %s | Foes: %d", zoneNameAt(g.playerPos), g.isNight() ? "Night" : "Day", g.aliveEnemies());
    ImGui::ProgressBar(g.hp / std::max(1.0f, g.maxHp), {-1, 0}, "HP");
    ImGui::ProgressBar(g.stamina / std::max(1.0f, g.maxStamina), {-1, 0}, "Stamina");
    ImGui::Text("Gold: %d | CC: %d | Kills: %d | Revive: %d", g.gold, g.cc, g.kills, g.reviveTokens);
    ImGui::Text("Domain Lv.%d (%.0fu) | Combo: %d", g.domainLevel, g.domainRange(), g.comboCount);
    ImGui::End();

    if (g.screen == GameScreen::Paused) {
        ImGui::SetNextWindowPos({kWindowWidth * 0.5f - 140.0f, kWindowHeight * 0.5f - 90.0f}, ImGuiCond_Always);
        ImGui::SetNextWindowSize({280, 180}, ImGuiCond_Always);
        ImGui::Begin("Paused", nullptr, ImGuiWindowFlags_NoResize | ImGuiWindowFlags_NoCollapse);
        if (ImGui::Button("Resume [Esc]", {-1, 36})) g.screen = GameScreen::Playing;
        if (ImGui::Button("Toggle Menu [Tab]", {-1, 36})) g.showMenu = !g.showMenu;
        if (ImGui::Button("Class Select", {-1, 36})) g.screen = GameScreen::ClassSelect;
        ImGui::End();
    }

    if (g.showMenu) {
        ImGui::SetNextWindowPos({340, 40}, ImGuiCond_FirstUseEver);
        ImGui::SetNextWindowSize({620, 460}, ImGuiCond_FirstUseEver);
        if (ImGui::Begin("Ascendant Grimoire [Tab]", &g.showMenu)) {
            if (ImGui::BeginTabBar("GrimoireTabs")) {
                if (ImGui::BeginTabItem("Stats")) {
                    ImGui::Text("STR: %d | DEF: %d | AGI: %d", g.totalStr(), g.totalDef(), g.totalAgi());
                    ImGui::Text("Best Streak: %d | Deaths: %d", g.bestStreak, g.deaths);
                    ImGui::Separator();
                    for (const auto& line : g.log) ImGui::TextWrapped("%s", line.c_str());
                    ImGui::EndTabItem();
                }
                if (ImGui::BeginTabItem("NFT Vault")) {
                    for (size_t i = 0; i < g.nfts.size(); ++i) {
                        auto& item = g.nfts[i];
                        ImGui::PushID(static_cast<int>(i));
                        ImGui::Text("%s (+%d STR, +%d DEF | %d CC)", item.name.c_str(), item.strBonus, item.defBonus, item.ccValue);
                        ImGui::SameLine();
                        if (ImGui::SmallButton(item.equipped ? "Unequip" : "Equip")) item.equipped = !item.equipped;
                        ImGui::SameLine();
                        if (ImGui::SmallButton("Sell")) {
                            g.cc += item.ccValue;
                            g.nfts.erase(g.nfts.begin() + static_cast<std::ptrdiff_t>(i));
                            ImGui::PopID();
                            break;
                        }
                        ImGui::PopID();
                    }
                    ImGui::EndTabItem();
                }
                if (ImGui::BeginTabItem("Shop")) {
                    if (ImGui::Button("Minor Potion (30G -> +30 HP)") && g.gold >= 30) {
                        g.gold -= 30; g.hp = std::min(g.maxHp, g.hp + 30.0f);
                    }
                    if (ImGui::Button("Major Potion (80G -> +80 HP)") && g.gold >= 80) {
                        g.gold -= 80; g.hp = std::min(g.maxHp, g.hp + 80.0f);
                    }
                    if (ImGui::Button("Energy Draught (40G -> +50 Stamina)") && g.gold >= 40) {
                        g.gold -= 40; g.stamina = std::min(g.maxStamina, g.stamina + 50.0f);
                    }
                    if (ImGui::Button("XP Scroll (50CC -> +200 XP)") && g.cc >= 50) {
                        g.cc -= 50; grantXp(g, 200);
                    }
                    if (ImGui::Button("CC Multiplier 2x (100CC -> 60s)") && g.cc >= 100) {
                        g.cc -= 100; g.ccMultTimer = 60.0f;
                    }
                    if (ImGui::Button("Revive Token (150G + 20CC)") && g.gold >= 150 && g.cc >= 20) {
                        g.gold -= 150; g.cc -= 20; g.reviveTokens += 1;
                    }
                    if (ImGui::Button("Nuke Cooldown Reset (200CC)") && g.cc >= 200) {
                        g.cc -= 200; g.nukeUnlocked = true; g.nukeCd = 0.0f;
                    }
                    if (ImGui::Button("Shadow Essence (60G + 30CC -> +10 STR/+5 AGI)") && g.gold >= 60 && g.cc >= 30) {
                        g.gold -= 60; g.cc -= 30; g.essenceBuffTimer = 300.0f;
                    }
                    ImGui::EndTabItem();
                }
                if (ImGui::BeginTabItem("Causality v2")) {
                    for (const auto& rule : g.causalityEngine.rules()) {
                        ImGui::Text("[P%d] %s | Fires:%d | CD:%.1fs | %s",
                            rule.priority, rule.id.c_str(), rule.fireCount, rule.cooldownRemaining,
                            rule.lastConditionMet ? "ACTIVE" : "idle");
                    }
                    ImGui::EndTabItem();
                }
                if (ImGui::BeginTabItem("Nuke & Domain")) {
                    ImGui::Text("Domain Level: %d / 999 (Range %.0fu)", g.domainLevel, g.domainRange());
                    ImGui::Text("Teraton Bomb: %s (CD %.1fs)", g.nukeUnlocked ? "Unlocked" : "Locked", g.nukeCd);
                    if (ImGui::Button("Summon Shadow King")) spawnEnemy(g, EnemyKind::Boss);
                    ImGui::EndTabItem();
                }
                if (ImGui::BeginTabItem("Graphics")) {
                    if (ImGui::RadioButton("30 FPS", g.fpsCap == 30)) g.fpsCap = 30;
                    ImGui::SameLine();
                    if (ImGui::RadioButton("60 FPS", g.fpsCap == 60)) g.fpsCap = 60;
                    ImGui::SameLine();
                    if (ImGui::RadioButton("Uncapped", g.fpsCap == 0)) g.fpsCap = 0;
                    ImGui::EndTabItem();
                }
                ImGui::EndTabBar();
            }
        }
        ImGui::End();
    }
}

} // namespace

int main() {
    if (!glfwInit()) {
        std::fprintf(stderr, "Failed to initialize GLFW\n");
        return 1;
    }

    glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 3);
    glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 3);
    glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);
#ifdef __APPLE__
    glfwWindowHint(GLFW_OPENGL_FORWARD_COMPAT, GL_TRUE);
#endif

    GLFWwindow* window = glfwCreateWindow(kWindowWidth, kWindowHeight, "ShadowRealm 3D — v3.0 Ascendant", nullptr, nullptr);
    if (!window) {
        std::fprintf(stderr, "Failed to create GLFW window\n");
        glfwTerminate();
        return 1;
    }
    glfwMakeContextCurrent(window);
    glfwSwapInterval(1);

    if (!gladLoadGL(reinterpret_cast<GLADloadfunc>(glfwGetProcAddress))) {
        std::fprintf(stderr, "Failed to load OpenGL 3.3 via GLAD\n");
        glfwDestroyWindow(window);
        glfwTerminate();
        return 1;
    }

    IMGUI_CHECKVERSION();
    ImGui::CreateContext();
    ImGui::StyleColorsDark();
    ImGui_ImplGlfw_InitForOpenGL(window, true);
    ImGui_ImplOpenGL3_Init("#version 330 core");

    GLuint vs = compileShader(GL_VERTEX_SHADER, kVertShaderSrc);
    GLuint fs = compileShader(GL_FRAGMENT_SHADER, kFragShaderSrc);
    GLuint shaderProgram = glCreateProgram();
    glAttachShader(shaderProgram, vs);
    glAttachShader(shaderProgram, fs);
    glLinkProgram(shaderProgram);
    glDeleteShader(vs);
    glDeleteShader(fs);

    MainUniforms uni;
    uni.uMVP = glGetUniformLocation(shaderProgram, "uMVP");
    uni.uModel = glGetUniformLocation(shaderProgram, "uModel");
    uni.uColor = glGetUniformLocation(shaderProgram, "uColor");
    uni.uLightDir = glGetUniformLocation(shaderProgram, "uLightDir");
    uni.uViewPos = glGetUniformLocation(shaderProgram, "uViewPos");
    uni.uZoneTint = glGetUniformLocation(shaderProgram, "uZoneTint");
    uni.uAmbient = glGetUniformLocation(shaderProgram, "uAmbient");
    uni.uFogColor = glGetUniformLocation(shaderProgram, "uFogColor");

    GLuint cubeVao = createCubeVao();
    glEnable(GL_DEPTH_TEST);

    GameState g;
    registerCausalityRules(g);
    populateWorldProps(g);
    topUpEnemies(g, 10, false);

    glfwSetWindowUserPointer(window, &g);
    glfwSetScrollCallback(window, [](GLFWwindow* w, double /*xoff*/, double yoff) {
        auto* state = static_cast<GameState*>(glfwGetWindowUserPointer(w));
        if (state) state->camDist = std::clamp(state->camDist - static_cast<float>(yoff) * 0.8f, 5.0f, 22.0f);
    });
    glfwSetKeyCallback(window, [](GLFWwindow* w, int key, int /*scancode*/, int action, int /*mods*/) {
        auto* state = static_cast<GameState*>(glfwGetWindowUserPointer(w));
        if (!state || action != GLFW_PRESS) return;
        if (key == GLFW_KEY_ESCAPE) {
            if (state->screen == GameScreen::Playing) state->screen = GameScreen::Paused;
            else if (state->screen == GameScreen::Paused) state->screen = GameScreen::Playing;
        } else if (key == GLFW_KEY_TAB || key == GLFW_KEY_F1) {
            if (state->screen != GameScreen::ClassSelect) state->showMenu = !state->showMenu;
        } else if (key == GLFW_KEY_F3) {
            state->showDebug = !state->showDebug;
        } else if (key == GLFW_KEY_F && state->screen == GameScreen::Playing) {
            state->flyMode = !state->flyMode;
        } else if (key == GLFW_KEY_R && state->hp <= 0.0f) {
            state->hp = state->maxHp;
            state->addLog("Revived at full vitality.");
        }
    });

    double prevTime = glfwGetTime();

    while (!glfwWindowShouldClose(window)) {
        double now = glfwGetTime();
        float rawDt = static_cast<float>(now - prevTime);
        if (g.fpsCap > 0 && rawDt < (1.0f / static_cast<float>(g.fpsCap))) {
            continue;
        }
        prevTime = now;
        float dt = std::clamp(rawDt, 0.0f, 0.1f);

        glfwPollEvents();

        // Camera RMB Orbit
        double mx = 0.0, my = 0.0;
        glfwGetCursorPos(window, &mx, &my);
        if (glfwGetMouseButton(window, GLFW_MOUSE_BUTTON_RIGHT) == GLFW_PRESS && !ImGui::GetIO().WantCaptureMouse) {
            if (g.rmbDown) {
                g.camYaw -= static_cast<float>(mx - g.lastMouseX) * 0.006f;
                g.camPitch = std::clamp(g.camPitch + static_cast<float>(my - g.lastMouseY) * 0.005f, 0.12f, 1.15f);
            }
            g.rmbDown = true;
        } else {
            g.rmbDown = false;
        }
        g.lastMouseX = mx;
        g.lastMouseY = my;

        if (g.screen == GameScreen::Playing) {
            g.dayTime = std::fmod(g.dayTime + dt, kDayCycleSeconds);
            g.attackCd = std::max(0.0f, g.attackCd - dt);
            g.powerCd = std::max(0.0f, g.powerCd - dt);
            g.healCd = std::max(0.0f, g.healCd - dt);
            g.dashCd = std::max(0.0f, g.dashCd - dt);
            g.domainCd = std::max(0.0f, g.domainCd - dt);
            g.nukeCd = std::max(0.0f, g.nukeCd - dt);
            g.ccMultTimer = std::max(0.0f, g.ccMultTimer - dt);
            g.essenceBuffTimer = std::max(0.0f, g.essenceBuffTimer - dt);
            if (g.comboTimer > 0.0f) {
                g.comboTimer = std::max(0.0f, g.comboTimer - dt);
                if (g.comboTimer <= 0.0f) g.comboCount = 0;
            }

            // Player Movement
            float inFwd = (glfwGetKey(window, GLFW_KEY_W) == GLFW_PRESS ? 1.0f : 0.0f) -
                          (glfwGetKey(window, GLFW_KEY_S) == GLFW_PRESS ? 1.0f : 0.0f);
            float inRight = (glfwGetKey(window, GLFW_KEY_D) == GLFW_PRESS ? 1.0f : 0.0f) -
                            (glfwGetKey(window, GLFW_KEY_A) == GLFW_PRESS ? 1.0f : 0.0f);
            bool moving = (inFwd != 0.0f || inRight != 0.0f);
            bool sprinting = moving && glfwGetKey(window, GLFW_KEY_LEFT_SHIFT) == GLFW_PRESS && g.stamina > 2.0f;
            if (sprinting) g.stamina = std::max(0.0f, g.stamina - 22.0f * dt);
            else g.stamina = std::min(g.maxStamina, g.stamina + 16.0f * dt);

            const auto& spec = kClassSpecs[static_cast<int>(g.playerClass)];
            if (moving) {
                glm::vec3 fwd{-std::sin(g.camYaw), 0.0f, -std::cos(g.camYaw)};
                glm::vec3 right{std::cos(g.camYaw), 0.0f, -std::sin(g.camYaw)};
                glm::vec3 dir = glm::normalize(fwd * inFwd + right * inRight);
                g.playerPos += dir * spec.speed * (sprinting ? 1.55f : 1.0f) * dt;
                g.playerYaw = std::atan2(dir.x, dir.z);
            }

            float groundY = terrainHeight(g.playerPos.x, g.playerPos.z) + 0.9f;
            if (g.flyMode) {
                if (glfwGetKey(window, GLFW_KEY_SPACE) == GLFW_PRESS) g.playerPos.y += 9.0f * dt;
                if (glfwGetKey(window, GLFW_KEY_LEFT_CONTROL) == GLFW_PRESS) g.playerPos.y -= 9.0f * dt;
                g.playerPos.y = std::max(groundY, g.playerPos.y);
            } else {
                if (g.onGround && glfwGetKey(window, GLFW_KEY_SPACE) == GLFW_PRESS) {
                    g.velY = kJumpVel;
                    g.onGround = false;
                }
                g.velY += kGravity * dt;
                g.playerPos.y += g.velY * dt;
                if (g.playerPos.y <= groundY) {
                    g.playerPos.y = groundY;
                    g.velY = 0.0f;
                    g.onGround = true;
                }
            }

            // Combat Actions
            if (glfwGetKey(window, GLFW_KEY_Z) == GLFW_PRESS && g.attackCd <= 0.0f) {
                g.attackCd = 0.38f;
                for (auto& e : g.enemies) {
                    if (!e.alive) continue;
                    if (glm::length(e.pos - g.playerPos) <= 4.6f) {
                        bool crit = g.randf(0.0f, 1.0f) < std::min(0.65f, 0.10f + g.totalAgi() * 0.012f);
                        float dmg = static_cast<float>(g.totalStr()) * (crit ? 4.0f : 1.0f);
                        damageEnemy(g, e, dmg, crit, STATUS_NONE);
                    }
                }
            }
            if (glfwGetKey(window, GLFW_KEY_X) == GLFW_PRESS && g.powerCd <= 0.0f) {
                g.powerCd = 5.5f;
                spawnParticles(g, g.playerPos, spec.color, 24);
                for (auto& e : g.enemies) {
                    if (!e.alive) continue;
                    if (glm::length(e.pos - g.playerPos) <= 9.5f) {
                        damageEnemy(g, e, static_cast<float>(g.totalStr()) * 1.9f, false, spec.powerStatus);
                    }
                }
            }
            if (glfwGetKey(window, GLFW_KEY_C) == GLFW_PRESS && g.healCd <= 0.0f) {
                g.healCd = 9.0f;
                g.hp = std::min(g.maxHp, g.hp + g.maxHp * 0.30f);
                spawnParticles(g, g.playerPos, {0.25f, 0.92f, 0.45f}, 16);
            }
            if (glfwGetKey(window, GLFW_KEY_G) == GLFW_PRESS && g.domainCd <= 0.0f) {
                g.domainActiveTimer = 8.0f;
                g.domainCd = std::max(15.0f, 40.0f - static_cast<float>(g.domainLevel) * 0.25f);
                g.addLog("INFINITE DEVOURING DOMAIN activated!");
                spawnParticles(g, g.playerPos, {0.66f, 0.33f, 0.97f}, 30);
            }
            if (glfwGetKey(window, GLFW_KEY_N) == GLFW_PRESS && g.nukeUnlocked && g.nukeCd <= 0.0f) {
                g.nukeCd = 90.0f;
                spawnParticles(g, g.playerPos, {0.20f, 0.85f, 0.96f}, 48);
                for (auto& e : g.enemies) {
                    if (e.alive && glm::length(e.pos - g.playerPos) <= 30.0f) {
                        damageEnemy(g, e, 450.0f + g.level * 40.0f, true, STATUS_BURN);
                    }
                }
                g.addLog("TERATON BOMB detonated!");
            }

            // Active Domain DPS
            if (g.domainActiveTimer > 0.0f) {
                g.domainActiveTimer = std::max(0.0f, g.domainActiveTimer - dt);
                float range = g.domainRange();
                for (auto& e : g.enemies) {
                    if (!e.alive) continue;
                    if (glm::length(e.pos - g.playerPos) <= range) {
                        e.hp -= (14.0f + (g.domainLevel >= 50 ? 8.0f : 0.0f)) * dt;
                        if (e.hp <= 0.0f) damageEnemy(g, e, 1.0f, false, STATUS_NONE);
                    }
                }
            }

            // 5-State Enemy AI
            bool night = g.isNight();
            for (auto& e : g.enemies) {
                if (!e.alive) continue;
                e.attackCd = std::max(0.0f, e.attackCd - dt);
                float moveMult = night ? 1.2f : 1.0f;
                if (e.statusTimer > 0.0f) {
                    e.statusTimer = std::max(0.0f, e.statusTimer - dt);
                    if (e.statusMask & STATUS_FREEZE) moveMult *= 0.45f;
                    if (e.statusMask & STATUS_STUN) moveMult = 0.0f;
                    if (e.statusMask & (STATUS_BURN | STATUS_POISON)) {
                        e.hp -= 8.0f * dt;
                        if (e.hp <= 0.0f) { damageEnemy(g, e, 1.0f, false, STATUS_NONE); continue; }
                    }
                    if (e.statusTimer <= 0.0f) e.statusMask = STATUS_NONE;
                }

                glm::vec3 toPlayer = g.playerPos - e.pos;
                toPlayer.y = 0.0f;
                float dist = glm::length(toPlayer);
                float hpPct = e.hp / std::max(1.0f, e.maxHp);

                if (e.fleeHpPct > 0.0f && hpPct <= e.fleeHpPct && dist < 24.0f) {
                    e.state = AIState::Flee;
                } else if (dist <= e.attackRange) {
                    e.state = AIState::Attack;
                } else if (dist <= (night ? 24.0f : 18.0f)) {
                    e.state = AIState::Chase;
                } else {
                    e.state = AIState::Patrol;
                }

                if (e.state == AIState::Chase && dist > 0.1f) {
                    e.pos += glm::normalize(toPlayer) * e.speed * moveMult * dt;
                } else if (e.state == AIState::Flee && dist > 0.1f) {
                    e.pos -= glm::normalize(toPlayer) * e.speed * moveMult * dt;
                } else if (e.state == AIState::Attack) {
                    if (e.kind == EnemyKind::Shade && dist < 10.0f && dist > 0.1f) {
                        e.pos -= glm::normalize(toPlayer) * e.speed * 0.7f * moveMult * dt;
                    }
                    if (e.attackCd <= 0.0f && moveMult > 0.0f) {
                        e.attackCd = 1.4f;
                        float mit = 100.0f / (100.0f + static_cast<float>(g.totalDef()) * 2.5f);
                        g.hp = std::max(0.0f, g.hp - e.attack * mit);
                        if (g.hp <= 0.0f) {
                            if (g.reviveTokens > 0) {
                                g.reviveTokens -= 1;
                                g.hp = g.maxHp * 0.5f;
                                g.addLog("Revive Token consumed — 50% HP restored!");
                            } else {
                                g.deaths += 1;
                                g.streak = 0;
                                g.addLog("You fell! Press [R] to revive.");
                            }
                        }
                    }
                }
                e.pos.y = terrainHeight(e.pos.x, e.pos.z) + (e.kind == EnemyKind::Boss ? 1.8f : 0.9f);
            }

            // Particles update
            for (auto& p : g.particles) {
                p.life -= dt;
                p.vel.y -= 12.0f * dt;
                p.pos += p.vel * dt;
            }
            g.particles.erase(
                std::remove_if(g.particles.begin(), g.particles.end(),
                    [](const Particle& p) { return p.life <= 0.0f; }),
                g.particles.end());

            g.causalityEngine.evaluate(g, dt);
        }

        // Render Scene
        int fbW = 0, fbH = 0;
        glfwGetFramebufferSize(window, &fbW, &fbH);
        glViewport(0, 0, fbW, fbH);

        float phase = (g.dayTime / kDayCycleSeconds) * 6.28318f;
        float dayFactor = std::clamp((std::sin(phase) + 0.2f) * 1.4f, 0.0f, 1.0f);
        glm::vec3 fogColor = glm::mix(glm::vec3{0.04f, 0.03f, 0.09f}, glm::vec3{0.32f, 0.42f, 0.58f}, dayFactor);
        glClearColor(fogColor.r, fogColor.g, fogColor.b, 1.0f);
        glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);

        float aspect = fbH > 0 ? static_cast<float>(fbW) / static_cast<float>(fbH) : 16.0f / 9.0f;
        glm::vec3 camOffset{
            std::sin(g.camYaw) * std::cos(g.camPitch) * g.camDist,
            std::sin(g.camPitch) * g.camDist + 2.2f,
            std::cos(g.camYaw) * std::cos(g.camPitch) * g.camDist
        };
        glm::vec3 camPos = g.playerPos + camOffset;
        glm::mat4 view = glm::lookAt(camPos, g.playerPos + glm::vec3{0.0f, 1.4f, 0.0f}, {0.0f, 1.0f, 0.0f});
        glm::mat4 proj = glm::perspective(glm::radians(60.0f), aspect, 0.2f, 220.0f);
        glm::mat4 vp = proj * view;

        glUseProgram(shaderProgram);
        glm::vec3 lightDir = glm::normalize(glm::vec3{std::cos(phase), std::max(0.25f, std::sin(phase)), 0.4f});
        glm::vec3 tint = zoneTintAt(g.playerPos);
        glUniform3fv(uni.uLightDir, 1, glm::value_ptr(lightDir));
        glUniform3fv(uni.uViewPos, 1, glm::value_ptr(camPos));
        glUniform3fv(uni.uZoneTint, 1, glm::value_ptr(tint));
        glUniform1f(uni.uAmbient, 0.22f + dayFactor * 0.28f);
        glUniform3fv(uni.uFogColor, 1, glm::value_ptr(fogColor));

        // Ground plane & Shadow Spire landmark
        drawBox(uni, cubeVao, vp, {0.0f, -0.5f, 0.0f}, {180.0f, 1.0f, 180.0f}, {0.18f, 0.28f, 0.22f});
        drawBox(uni, cubeVao, vp, {-4.5f, 7.0f, -18.0f}, {1.6f, 14.0f, 1.6f}, {0.16f, 0.13f, 0.22f});
        drawBox(uni, cubeVao, vp, { 4.5f, 7.0f, -18.0f}, {1.6f, 14.0f, 1.6f}, {0.16f, 0.13f, 0.22f});
        drawBox(uni, cubeVao, vp, { 0.0f, 14.2f, -18.0f}, {10.6f, 1.2f, 1.6f}, {0.82f, 0.62f, 0.24f});
        drawBox(uni, cubeVao, vp, { 0.0f, 8.0f, -18.0f}, {1.8f, 3.2f, 1.8f}, {0.66f, 0.33f, 0.97f});

        // World Props (trees & mushrooms)
        for (const auto& prop : g.props) {
            drawBox(uni, cubeVao, vp, prop.pos, prop.scale, prop.color);
        }

        // Player
        drawBox(uni, cubeVao, vp, g.playerPos, {0.85f, 1.8f, 0.65f}, kClassSpecs[static_cast<int>(g.playerClass)].color);

        // Enemies
        for (const auto& e : g.enemies) {
            if (!e.alive) continue;
            glm::vec3 col = e.kind == EnemyKind::Boss ? glm::vec3{0.88f, 0.12f, 0.28f}
                          : e.kind == EnemyKind::Shade ? glm::vec3{0.16f, 0.80f, 0.92f}
                          : e.kind == EnemyKind::Goblin ? glm::vec3{0.25f, 0.52f, 0.25f}
                                                        : glm::vec3{0.42f, 0.36f, 0.48f};
            glm::vec3 sz = e.kind == EnemyKind::Boss ? glm::vec3{2.0f, 3.6f, 2.0f} : glm::vec3{0.9f, 1.5f, 0.9f};
            drawBox(uni, cubeVao, vp, e.pos, sz, col);
        }

        // Particles
        for (const auto& p : g.particles) {
            drawBox(uni, cubeVao, vp, p.pos, glm::vec3{p.size}, p.color);
        }

        // Dear ImGui Pass
        ImGui_ImplOpenGL3_NewFrame();
        ImGui_ImplGlfw_NewFrame();
        ImGui::NewFrame();
        renderImGui(g);
        ImGui::Render();
        ImGui_ImplOpenGL3_RenderDrawData(ImGui::GetDrawData());

        glfwSwapBuffers(window);
    }

    ImGui_ImplOpenGL3_Shutdown();
    ImGui_ImplGlfw_Shutdown();
    ImGui::DestroyContext();
    glDeleteProgram(shaderProgram);
    glDeleteVertexArrays(1, &cubeVao);
    glfwDestroyWindow(window);
    glfwTerminate();
    return 0;
}
