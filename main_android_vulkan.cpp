// ============================================================================
//  main_android_vulkan.cpp — ShadowRealm 3D Engine (Android NDK, Vulkan 1.3)
//  Build: Android NDK r26+, C++17/C++20, Vulkan 1.3 (HDR10+ swapchain)
// ============================================================================
#include <android/input.h>
#include <android/log.h>
#include <android/native_window.h>
#include <android_native_app_glue.h>
#include <vulkan/vulkan.h>

#include <algorithm>
#include <vector>
#include <unordered_map>
#include <unordered_set>
#include <string>
#include <memory>
#include <cmath>
#include <chrono>
#include <atomic>
#include <thread>
#include <mutex>
#include <queue>
#include <random>

#define LOG_TAG "MMORPG"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO,  LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)
#define VK_CHECK(x) do { VkResult r=(x); if(r!=VK_SUCCESS){LOGE("VK fail %d @ %s:%d",r,__FILE__,__LINE__);} } while(0)

// ============================================================================
//  MATH  —  minimal linear algebra
// ============================================================================
namespace math {
struct Vec3 {
    float x=0,y=0,z=0;
    Vec3()=default;
    Vec3(float a,float b,float c):x(a),y(b),z(c){}
    Vec3 operator+(const Vec3&o)const{return{x+o.x,y+o.y,z+o.z};}
    Vec3 operator-(const Vec3&o)const{return{x-o.x,y-o.y,z-o.z};}
    Vec3 operator*(float s)const{return{x*s,y*s,z*s};}
    float dot(const Vec3&o)const{return x*o.x+y*o.y+z*o.z;}
    Vec3 cross(const Vec3&o)const{return{y*o.z-z*o.y, z*o.x-x*o.z, x*o.y-y*o.x};}
    float length()const{return std::sqrt(dot(*this));}
    Vec3 normalized()const{float l=length(); return l>1e-6f?(*this)*(1.f/l):Vec3{};}
};

struct Mat4 {
    float m[16]={1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1};
    static Mat4 identity(){return Mat4{};}
    static Mat4 perspective(float fovY,float aspect,float zn,float zf){
        Mat4 r; for(auto&v:r.m)v=0;
        float t=std::tan(fovY*0.5f);
        r.m[0]=1.f/(aspect*t); r.m[5]=1.f/t;
        r.m[10]=zf/(zn-zf);    r.m[11]=-1.f;
        r.m[14]=(zn*zf)/(zn-zf);
        return r;
    }
    static Mat4 lookAt(const Vec3&eye,const Vec3&center,const Vec3&up){
        Vec3 f=(center-eye).normalized();
        Vec3 s=f.cross(up).normalized();
        Vec3 u=s.cross(f);
        Mat4 r;
        r.m[0]=s.x; r.m[4]=s.y; r.m[8]=s.z;
        r.m[1]=u.x; r.m[5]=u.y; r.m[9]=u.z;
        r.m[2]=-f.x;r.m[6]=-f.y;r.m[10]=-f.z;
        r.m[12]=-s.dot(eye); r.m[13]=-u.dot(eye); r.m[14]=f.dot(eye);
        return r;
    }
    Mat4 operator*(const Mat4&o)const{
        Mat4 r; for(auto&v:r.m)v=0;
        for(int c=0;c<4;c++)for(int row=0;row<4;row++)for(int k=0;k<4;k++)
            r.m[c*4+row]+=m[k*4+row]*o.m[c*4+k];
        return r;
    }
};
} // namespace math
using math::Vec3; using math::Mat4;

// ============================================================================
//  ENTITY-COMPONENT-SYSTEM (lightweight)
// ============================================================================
using EntityID = uint32_t;
constexpr EntityID INVALID_ENTITY = 0;

struct Transform { Vec3 position; Vec3 rotation; Vec3 scale{1,1,1}; };
struct Velocity  { Vec3 linear; };
struct Health    { float current=100.f; float max=100.f; bool alive()const{return current>0;} };
struct Combat    { float attack=10.f; float defense=5.f; float range=2.f; float cooldown=0; };
struct RenderMesh{ uint32_t meshId=0; uint32_t materialId=0; bool visible=true; };

enum class AIState { Idle, Patrol, Chase, Attack, Flee, Dead };
struct AIBrain {
    AIState state = AIState::Idle;
    EntityID target = INVALID_ENTITY;
    Vec3 spawnPoint;
    float aggroRange = 15.f;
    float patrolTimer = 0;
    Vec3 patrolTarget;
};

// ============================================================================
//  WORLD  —  ECS storage + open-world chunk streaming
// ============================================================================
class World {
public:
    EntityID create() {
        EntityID id = ++m_nextId;
        m_alive.insert(id);
        return id;
    }
    void destroy(EntityID id) {
        m_alive.erase(id);
        m_transforms.erase(id);
        m_velocities.erase(id);
        m_health.erase(id);
        m_combat.erase(id);
        m_meshes.erase(id);
        m_brains.erase(id);
    }
    bool valid(EntityID id) const { return m_alive.count(id)>0; }

    Transform&  transform(EntityID e){ return m_transforms[e]; }
    Velocity&   velocity(EntityID e){ return m_velocities[e]; }
    Health&     health(EntityID e){ return m_health[e]; }
    Combat&     combat(EntityID e){ return m_combat[e]; }
    RenderMesh& mesh(EntityID e){ return m_meshes[e]; }
    AIBrain&    brain(EntityID e){ return m_brains[e]; }

    bool has_brain(EntityID e)const{ return m_brains.count(e)>0; }
    bool has_health(EntityID e)const{ return m_health.count(e)>0; }
    bool has_mesh(EntityID e)const{ return m_meshes.count(e)>0; }

    const std::unordered_map<EntityID,Transform>& transforms()const{return m_transforms;}
    const std::unordered_map<EntityID,AIBrain>&    brains()const{return m_brains;}
    const std::unordered_map<EntityID,RenderMesh>& meshes()const{return m_meshes;}

    std::vector<EntityID> entitiesInRadius(const Vec3&center,float r)const{
        std::vector<EntityID> out;
        float r2=r*r;
        for(auto&[id,t]:m_transforms){
            Vec3 d=t.position-center;
            if(d.dot(d)<=r2) out.push_back(id);
        }
        return out;
    }

private:
    EntityID m_nextId = INVALID_ENTITY;
    std::unordered_map<EntityID,Transform>  m_transforms;
    std::unordered_map<EntityID,Velocity>   m_velocities;
    std::unordered_map<EntityID,Health>     m_health;
    std::unordered_map<EntityID,Combat>     m_combat;
    std::unordered_map<EntityID,RenderMesh> m_meshes;
    std::unordered_map<EntityID,AIBrain>    m_brains;
    std::unordered_set<EntityID>            m_alive;

    friend class TerrainStreamer;
};

// ============================================================================
//  TERRAIN STREAMING  —  open world divided into chunks
// ============================================================================
struct TerrainChunk {
    int cx, cz;
    bool loaded = false;
    std::vector<float> heightmap; // resolution*resolution
    std::vector<EntityID> spawnedEntities;
};

class TerrainStreamer {
public:
    static constexpr int CHUNK_SIZE = 256;       // world units
    static constexpr int HEIGHTMAP_RES = 64;
    static constexpr int VIEW_DISTANCE = 3;       // chunks each direction

    explicit TerrainStreamer(World& w): m_world(w) {}

    void update(const Vec3& playerPos) {
        int pcx = (int)std::floor(playerPos.x / CHUNK_SIZE);
        int pcz = (int)std::floor(playerPos.z / CHUNK_SIZE);

        // Load nearby chunks
        for(int dz=-VIEW_DISTANCE; dz<=VIEW_DISTANCE; ++dz)
        for(int dx=-VIEW_DISTANCE; dx<=VIEW_DISTANCE; ++dx) {
            loadChunk(pcx+dx, pcz+dz);
        }
        // Unload distant chunks
        std::vector<uint64_t> toUnload;
        for(auto&[key,ch]:m_chunks) {
            if(std::abs(ch.cx-pcx)>VIEW_DISTANCE+1 ||
               std::abs(ch.cz-pcz)>VIEW_DISTANCE+1) {
                toUnload.push_back(key);
            }
        }
        for(auto k:toUnload) unloadChunk(k);
    }

    float sampleHeight(float x,float z)const {
        int cx=(int)std::floor(x/CHUNK_SIZE), cz=(int)std::floor(z/CHUNK_SIZE);
        auto it=m_chunks.find(key(cx,cz));
        if(it==m_chunks.end()) return 0.f;
        return proceduralHeight(x,z);
    }

private:
    static uint64_t key(int cx,int cz){
        return (uint64_t(uint32_t(cx))<<32) | uint32_t(cz);
    }
    static float proceduralHeight(float x,float z){
        float h =  std::sin(x*0.01f)*std::cos(z*0.01f)*20.f;
        h += std::sin(x*0.05f+z*0.03f)*5.f;
        h += std::sin(x*0.2f)*1.5f;
        return h;
    }

    void loadChunk(int cx,int cz){
        uint64_t k=key(cx,cz);
        if(m_chunks.count(k)) return;
        TerrainChunk ch; ch.cx=cx; ch.cz=cz; ch.loaded=true;
        ch.heightmap.resize(HEIGHTMAP_RES*HEIGHTMAP_RES);
        for(int z=0;z<HEIGHTMAP_RES;z++)
        for(int x=0;x<HEIGHTMAP_RES;x++){
            float wx=cx*CHUNK_SIZE + x*(CHUNK_SIZE/(float)HEIGHTMAP_RES);
            float wz=cz*CHUNK_SIZE + z*(CHUNK_SIZE/(float)HEIGHTMAP_RES);
            ch.heightmap[z*HEIGHTMAP_RES+x]=proceduralHeight(wx,wz);
        }
        spawnMonsters(ch);
        m_chunks.emplace(k,std::move(ch));
        LOGI("Chunk loaded (%d,%d). Total=%zu",cx,cz,m_chunks.size());
    }

    void unloadChunk(uint64_t k){
        auto it=m_chunks.find(k);
        if(it==m_chunks.end()) return;
        for(EntityID e:it->second.spawnedEntities) m_world.destroy(e);
        m_chunks.erase(it);
    }

    void spawnMonsters(TerrainChunk& ch){
        std::mt19937 rng(uint32_t(key(ch.cx,ch.cz)));
        std::uniform_int_distribution<int> count(2,6);
        std::uniform_real_distribution<float> pos(0,CHUNK_SIZE);
        int n=count(rng);
        for(int i=0;i<n;i++){
            EntityID e=m_world.create();
            float wx=ch.cx*CHUNK_SIZE+pos(rng);
            float wz=ch.cz*CHUNK_SIZE+pos(rng);
            auto&t=m_world.transform(e);
            t.position={wx, proceduralHeight(wx,wz), wz};
            m_world.health(e)={80,80};
            m_world.combat(e)={8,3,2.5f,0};
            m_world.mesh(e)={1,1,true};
            auto&b=m_world.brain(e);
            b.state=AIState::Patrol; b.spawnPoint=t.position;
            ch.spawnedEntities.push_back(e);
        }
    }

    World& m_world;
    std::unordered_map<uint64_t,TerrainChunk> m_chunks;
};

// ============================================================================
//  SYSTEMS  —  movement, AI, combat
// ============================================================================
class MovementSystem {
public:
    void update(World& w, TerrainStreamer& terrain, float dt){
        for(auto&[id,t]:const_cast<std::unordered_map<EntityID,Transform>&>(w.transforms())){
            // velocity applied elsewhere; clamp to terrain
            t.position.y = terrain.sampleHeight(t.position.x,t.position.z);
        }
    }
};

class AISystem {
public:
    void update(World& w, EntityID player, float dt){
        if(!w.valid(player)) return;
        Vec3 ppos = w.transform(player).position;

        std::vector<EntityID> ids;
        for(auto&[id,b]:w.brains()) ids.push_back(id);

        for(EntityID e:ids){
            if(!w.valid(e)) continue;
            auto&b=w.brain(e);
            auto&t=w.transform(e);
            if(w.has_health(e) && !w.health(e).alive()){ b.state=AIState::Dead; continue; }

            Vec3 toPlayer = ppos - t.position;
            float dist = toPlayer.length();

            switch(b.state){
            case AIState::Idle:
            case AIState::Patrol:
                if(dist < b.aggroRange){ b.state=AIState::Chase; b.target=player; }
                else doPatrol(b,t,dt);
                break;
            case AIState::Chase:
                if(dist > b.aggroRange*1.5f){ b.state=AIState::Patrol; }
                else if(dist <= w.combat(e).range){ b.state=AIState::Attack; }
                else { t.position = t.position + toPlayer.normalized()*(3.f*dt); }
                break;
            case AIState::Attack:
                if(dist > w.combat(e).range*1.2f){ b.state=AIState::Chase; }
                else {
                    auto&c=w.combat(e);
                    c.cooldown -= dt;
                    if(c.cooldown<=0){
                        applyDamage(w,player,c.attack);
                        c.cooldown=1.5f;
                    }
                }
                break;
            default: break;
            }
        }
    }

    static void applyDamage(World& w, EntityID target, float dmg){
        if(!w.valid(target)||!w.has_health(target)) return;
        auto&h=w.health(target);
        float def = w.combat(target).defense;
        float real = std::max(1.f, dmg-def);
        h.current = std::max(0.f, h.current-real);
        LOGI("Entity %u took %.1f dmg (hp=%.0f)",target,real,h.current);
    }

private:
    void doPatrol(AIBrain&b,Transform&t,float dt){
        b.patrolTimer-=dt;
        if(b.patrolTimer<=0){
            static thread_local std::mt19937 rng(std::random_device{}());
            std::uniform_real_distribution<float> off(-20,20);
            b.patrolTarget = b.spawnPoint + Vec3{off(rng),0,off(rng)};
            b.patrolTimer=4.f;
        }
        Vec3 dir=(b.patrolTarget-t.position);
        if(dir.length()>0.5f) t.position=t.position+dir.normalized()*(1.5f*dt);
    }
};

// ============================================================================
//  PLAYER  —  controller + skills + inventory
// ============================================================================
struct Item { uint32_t id; std::string name; int quantity; };

struct Skill {
    std::string name;
    float cooldown, currentCd=0;
    float damage, range;
    bool ready()const{return currentCd<=0;}
};

class Player {
public:
    EntityID entity = INVALID_ENTITY;
    int level=1, experience=0, gold=0;
    std::vector<Item> inventory;
    std::vector<Skill> skills;

    void init(World& w){
        entity=w.create();
        w.transform(entity).position={0,0,0};
        w.health(entity)={150,150};
        w.combat(entity)={25,10,3,0};
        w.mesh(entity)={0,0,true};
        skills={
            {"Slash",   0.8f,0, 30, 3.0f},
            {"Fireball",3.0f,0, 60, 12.0f},
            {"Heal",    8.0f,0,-40, 0.0f},
        };
    }

    void move(World& w, const Vec3& dir, float speed, float dt){
        if(!w.valid(entity)) return;
        w.transform(entity).position = w.transform(entity).position + dir.normalized()*(speed*dt);
    }

    void useSkill(World& w, int idx){
        if(idx<0||idx>=(int)skills.size()) return;
        Skill&s=skills[idx];
        if(!s.ready()){ LOGI("%s on cooldown",s.name.c_str()); return; }
        s.currentCd=s.cooldown;
        Vec3 pos=w.transform(entity).position;
        if(s.damage<0){ // heal
            auto&h=w.health(entity);
            h.current=std::min(h.max,h.current-s.damage);
            LOGI("Healed to %.0f",h.current);
            return;
        }
        for(EntityID t:w.entitiesInRadius(pos,s.range)){
            if(t==entity||!w.has_health(t)) continue;
            AISystem::applyDamage(w,t,s.damage);
            if(!w.health(t).alive()) onKill(w,t);
        }
    }

    void updateCooldowns(float dt){
        for(auto&s:skills) if(s.currentCd>0) s.currentCd-=dt;
    }

    void onKill(World& w, EntityID enemy){
        experience+=25; gold+=10;
        if(experience>=level*100){ experience=0; level++;
            w.health(entity).max+=20; w.health(entity).current=w.health(entity).max;
            LOGI("LEVEL UP! Now level %d",level);
        }
        addItem({100,"Monster Loot",1});
    }

    void addItem(const Item& it){
        for(auto&i:inventory) if(i.id==it.id){ i.quantity+=it.quantity; return; }
        inventory.push_back(it);
    }
};

// ============================================================================
//  LOCAL LOOPBACK SESSION TRANSPORT (offline-safe until server is configured)
// ============================================================================
struct NetPacket {
    enum Type:uint16_t { PLAYER_MOVE, PLAYER_ATTACK, CHAT, SPAWN, DESPAWN } type;
    EntityID entity;
    Vec3 position;
    char payload[128];
};

class NetworkClient {
public:
    std::atomic<bool> connected{false};

    void connect(const std::string& host, int port) {
        if (host.empty() || port <= 0) return;
        disconnect();
        m_host = host;
        m_port = port;
        connected = true;
        m_worker = std::thread([this] { runLoop(); });
        LOGI("Session transport bound to %s:%d", host.c_str(), port);
    }
    void disconnect() {
        connected = false;
        if (m_worker.joinable()) m_worker.join();
    }
    void send(const NetPacket& p) {
        if (!connected) return;
        std::lock_guard<std::mutex> lk(m_mtx);
        m_outgoing.push(p);
    }
    bool poll(NetPacket& out) {
        std::lock_guard<std::mutex> lk(m_mtx);
        if (m_incoming.empty()) return false;
        out = m_incoming.front();
        m_incoming.pop();
        return true;
    }
    ~NetworkClient() { disconnect(); }

private:
    void runLoop() {
        while (connected) {
            {
                std::lock_guard<std::mutex> lk(m_mtx);
                while (!m_outgoing.empty()) {
                    NetPacket p = m_outgoing.front();
                    m_outgoing.pop();
                    m_incoming.push(p);
                }
            }
            std::this_thread::sleep_for(std::chrono::milliseconds(50));
        }
    }
    std::string m_host;
    int m_port = 0;
    std::thread m_worker;
    std::mutex m_mtx;
    std::queue<NetPacket> m_outgoing, m_incoming;
};

// ============================================================================
//  VULKAN RENDERER — HDR10+ swapchain + command submission & presentation
// ============================================================================
class Renderer {
public:
    bool init(ANativeWindow* window) {
        m_window = window;
        if (!createInstance()) return false;
        if (!createSurface()) return false;
        if (!pickPhysicalDevice()) return false;
        if (!createDevice()) return false;
        if (!createSwapchainHDR()) return false;
        if (!createFrameResources()) return false;
        LOGI("Vulkan + HDR10+ renderer initialized (%ux%u, %zu swapchain images)",
             m_extent.width, m_extent.height, m_swapImages.size());
        return true;
    }

    void drawFrame(World& w, const Mat4& view, const Mat4& proj) {
        (void)view;
        (void)proj;
        if (!m_device || !m_swapchain) return;

        vkWaitForFences(m_device, 1, &m_inFlight, VK_TRUE, UINT64_MAX);
        vkResetFences(m_device, 1, &m_inFlight);

        uint32_t imageIndex = 0;
        VkResult acq = vkAcquireNextImageKHR(m_device, m_swapchain, UINT64_MAX, m_imageAvail, VK_NULL_HANDLE, &imageIndex);
        if (acq != VK_SUCCESS && acq != VK_SUBOPTIMAL_KHR) return;

        vkResetCommandBuffer(m_cmdBuf, 0);
        VkCommandBufferBeginInfo bi{VK_STRUCTURE_TYPE_COMMAND_BUFFER_BEGIN_INFO};
        bi.flags = VK_COMMAND_BUFFER_USAGE_ONE_TIME_SUBMIT_BIT;
        vkBeginCommandBuffer(m_cmdBuf, &bi);

        VkImage img = m_swapImages[imageIndex];
        VkImageSubresourceRange range{VK_IMAGE_ASPECT_COLOR_BIT, 0, 1, 0, 1};

        VkImageMemoryBarrier toTransfer{VK_STRUCTURE_TYPE_IMAGE_MEMORY_BARRIER};
        toTransfer.oldLayout = VK_IMAGE_LAYOUT_UNDEFINED;
        toTransfer.newLayout = VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL;
        toTransfer.srcQueueFamilyIndex = VK_QUEUE_FAMILY_IGNORED;
        toTransfer.dstQueueFamilyIndex = VK_QUEUE_FAMILY_IGNORED;
        toTransfer.image = img;
        toTransfer.subresourceRange = range;
        toTransfer.dstAccessMask = VK_ACCESS_TRANSFER_WRITE_BIT;
        vkCmdPipelineBarrier(m_cmdBuf, VK_PIPELINE_STAGE_TOP_OF_PIPE_BIT, VK_PIPELINE_STAGE_TRANSFER_BIT,
                             0, 0, nullptr, 0, nullptr, 1, &toTransfer);

        float pulse = 0.04f + 0.02f * std::sin(static_cast<float>(m_frame) * 0.03f);
        float entityTint = std::min(0.08f, static_cast<float>(w.meshes().size()) * 0.002f);
        VkClearColorValue clearColor{{0.03f + entityTint, 0.015f, 0.07f + pulse, 1.0f}};
        vkCmdClearColorImage(m_cmdBuf, img, VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL, &clearColor, 1, &range);

        VkImageMemoryBarrier toPresent{VK_STRUCTURE_TYPE_IMAGE_MEMORY_BARRIER};
        toPresent.oldLayout = VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL;
        toPresent.newLayout = VK_IMAGE_LAYOUT_PRESENT_SRC_KHR;
        toPresent.srcQueueFamilyIndex = VK_QUEUE_FAMILY_IGNORED;
        toPresent.dstQueueFamilyIndex = VK_QUEUE_FAMILY_IGNORED;
        toPresent.image = img;
        toPresent.subresourceRange = range;
        toPresent.srcAccessMask = VK_ACCESS_TRANSFER_WRITE_BIT;
        vkCmdPipelineBarrier(m_cmdBuf, VK_PIPELINE_STAGE_TRANSFER_BIT, VK_PIPELINE_STAGE_BOTTOM_OF_PIPE_BIT,
                             0, 0, nullptr, 0, nullptr, 1, &toPresent);

        vkEndCommandBuffer(m_cmdBuf);

        VkPipelineStageFlags waitStage = VK_PIPELINE_STAGE_TRANSFER_BIT;
        VkSubmitInfo submit{VK_STRUCTURE_TYPE_SUBMIT_INFO};
        submit.waitSemaphoreCount = 1;
        submit.pWaitSemaphores = &m_imageAvail;
        submit.pWaitDstStageMask = &waitStage;
        submit.commandBufferCount = 1;
        submit.pCommandBuffers = &m_cmdBuf;
        submit.signalSemaphoreCount = 1;
        submit.pSignalSemaphores = &m_renderDone;
        VK_CHECK(vkQueueSubmit(m_queue, 1, &submit, m_inFlight));

        VkPresentInfoKHR present{VK_STRUCTURE_TYPE_PRESENT_INFO_KHR};
        present.waitSemaphoreCount = 1;
        present.pWaitSemaphores = &m_renderDone;
        present.swapchainCount = 1;
        present.pSwapchains = &m_swapchain;
        present.pImageIndices = &imageIndex;
        vkQueuePresentKHR(m_queue, &present);
        m_frame++;
    }

    void shutdown() {
        if (m_device) vkDeviceWaitIdle(m_device);
        if (m_inFlight) { vkDestroyFence(m_device, m_inFlight, nullptr); m_inFlight = VK_NULL_HANDLE; }
        if (m_renderDone) { vkDestroySemaphore(m_device, m_renderDone, nullptr); m_renderDone = VK_NULL_HANDLE; }
        if (m_imageAvail) { vkDestroySemaphore(m_device, m_imageAvail, nullptr); m_imageAvail = VK_NULL_HANDLE; }
        if (m_cmdPool) { vkDestroyCommandPool(m_device, m_cmdPool, nullptr); m_cmdPool = VK_NULL_HANDLE; m_cmdBuf = VK_NULL_HANDLE; }
        if (m_swapchain) { vkDestroySwapchainKHR(m_device, m_swapchain, nullptr); m_swapchain = VK_NULL_HANDLE; }
        m_swapImages.clear();
        if (m_device) { vkDestroyDevice(m_device, nullptr); m_device = VK_NULL_HANDLE; }
        if (m_surface) { vkDestroySurfaceKHR(m_instance, m_surface, nullptr); m_surface = VK_NULL_HANDLE; }
        if (m_instance) { vkDestroyInstance(m_instance, nullptr); m_instance = VK_NULL_HANDLE; }
    }

    uint32_t width() const { return m_extent.width ? m_extent.width : 1920; }
    uint32_t height() const { return m_extent.height ? m_extent.height : 1080; }

private:
    bool createInstance() {
        VkApplicationInfo app{VK_STRUCTURE_TYPE_APPLICATION_INFO};
        app.pApplicationName = "ShadowRealm3D";
        app.apiVersion = VK_API_VERSION_1_3;
        const char* exts[] = {"VK_KHR_surface", "VK_KHR_android_surface",
                              "VK_EXT_swapchain_colorspace"};
        VkInstanceCreateInfo ci{VK_STRUCTURE_TYPE_INSTANCE_CREATE_INFO};
        ci.pApplicationInfo = &app;
        ci.enabledExtensionCount = 3;
        ci.ppEnabledExtensionNames = exts;
        return vkCreateInstance(&ci, nullptr, &m_instance) == VK_SUCCESS;
    }
    bool createSurface() {
        VkAndroidSurfaceCreateInfoKHR ci{VK_STRUCTURE_TYPE_ANDROID_SURFACE_CREATE_INFO_KHR};
        ci.window = m_window;
        return vkCreateAndroidSurfaceKHR(m_instance, &ci, nullptr, &m_surface) == VK_SUCCESS;
    }
    bool pickPhysicalDevice() {
        uint32_t n = 0;
        vkEnumeratePhysicalDevices(m_instance, &n, nullptr);
        if (!n) return false;
        std::vector<VkPhysicalDevice> devs(n);
        vkEnumeratePhysicalDevices(m_instance, &n, devs.data());
        m_phys = devs[0];
        return true;
    }
    bool createDevice() {
        float prio = 1.f;
        VkDeviceQueueCreateInfo q{VK_STRUCTURE_TYPE_DEVICE_QUEUE_CREATE_INFO};
        q.queueCount = 1;
        q.pQueuePriorities = &prio;
        q.queueFamilyIndex = 0;
        const char* exts[] = {"VK_KHR_swapchain"};
        VkDeviceCreateInfo ci{VK_STRUCTURE_TYPE_DEVICE_CREATE_INFO};
        ci.queueCreateInfoCount = 1;
        ci.pQueueCreateInfos = &q;
        ci.enabledExtensionCount = 1;
        ci.ppEnabledExtensionNames = exts;
        if (vkCreateDevice(m_phys, &ci, nullptr, &m_device) != VK_SUCCESS) return false;
        vkGetDeviceQueue(m_device, 0, 0, &m_queue);
        return true;
    }
    bool createSwapchainHDR() {
        uint32_t fmtN = 0;
        vkGetPhysicalDeviceSurfaceFormatsKHR(m_phys, m_surface, &fmtN, nullptr);
        if (!fmtN) return false;
        std::vector<VkSurfaceFormatKHR> fmts(fmtN);
        vkGetPhysicalDeviceSurfaceFormatsKHR(m_phys, m_surface, &fmtN, fmts.data());

        VkSurfaceFormatKHR chosen = fmts[0];
        for (auto& f : fmts) {
            if (f.colorSpace == VK_COLOR_SPACE_HDR10_ST2084_EXT) {
                chosen = f;
                m_hdrEnabled = true;
                break;
            }
        }
        LOGI("HDR10+ %s", m_hdrEnabled ? "ENABLED" : "not available (SDR fallback)");

        VkSurfaceCapabilitiesKHR caps;
        vkGetPhysicalDeviceSurfaceCapabilitiesKHR(m_phys, m_surface, &caps);
        m_extent = caps.currentExtent;
        uint32_t imgCount = caps.minImageCount + 1;
        if (caps.maxImageCount > 0 && imgCount > caps.maxImageCount) {
            imgCount = caps.maxImageCount;
        }
        VkSwapchainCreateInfoKHR sc{VK_STRUCTURE_TYPE_SWAPCHAIN_CREATE_INFO_KHR};
        sc.surface = m_surface;
        sc.minImageCount = imgCount;
        sc.imageFormat = chosen.format;
        sc.imageColorSpace = chosen.colorSpace;
        sc.imageExtent = m_extent;
        sc.imageArrayLayers = 1;
        sc.imageUsage = VK_IMAGE_USAGE_COLOR_ATTACHMENT_BIT | VK_IMAGE_USAGE_TRANSFER_DST_BIT;
        sc.preTransform = caps.currentTransform;
        sc.compositeAlpha = VK_COMPOSITE_ALPHA_OPAQUE_BIT_KHR;
        sc.presentMode = VK_PRESENT_MODE_FIFO_KHR;
        sc.clipped = VK_TRUE;
        if (vkCreateSwapchainKHR(m_device, &sc, nullptr, &m_swapchain) != VK_SUCCESS) return false;

        uint32_t actualCount = 0;
        vkGetSwapchainImagesKHR(m_device, m_swapchain, &actualCount, nullptr);
        m_swapImages.resize(actualCount);
        vkGetSwapchainImagesKHR(m_device, m_swapchain, &actualCount, m_swapImages.data());
        return !m_swapImages.empty();
    }
    bool createFrameResources() {
        VkCommandPoolCreateInfo poolInfo{VK_STRUCTURE_TYPE_COMMAND_POOL_CREATE_INFO};
        poolInfo.queueFamilyIndex = 0;
        poolInfo.flags = VK_COMMAND_POOL_CREATE_RESET_COMMAND_BUFFER_BIT;
        if (vkCreateCommandPool(m_device, &poolInfo, nullptr, &m_cmdPool) != VK_SUCCESS) return false;

        VkCommandBufferAllocateInfo alloc{VK_STRUCTURE_TYPE_COMMAND_BUFFER_ALLOCATE_INFO};
        alloc.commandPool = m_cmdPool;
        alloc.level = VK_COMMAND_BUFFER_LEVEL_PRIMARY;
        alloc.commandBufferCount = 1;
        if (vkAllocateCommandBuffers(m_device, &alloc, &m_cmdBuf) != VK_SUCCESS) return false;

        VkSemaphoreCreateInfo sem{VK_STRUCTURE_TYPE_SEMAPHORE_CREATE_INFO};
        VkFenceCreateInfo fence{VK_STRUCTURE_TYPE_FENCE_CREATE_INFO};
        fence.flags = VK_FENCE_CREATE_SIGNALED_BIT;
        return vkCreateSemaphore(m_device, &sem, nullptr, &m_imageAvail) == VK_SUCCESS &&
               vkCreateSemaphore(m_device, &sem, nullptr, &m_renderDone) == VK_SUCCESS &&
               vkCreateFence(m_device, &fence, nullptr, &m_inFlight) == VK_SUCCESS;
    }

    ANativeWindow* m_window = nullptr;
    VkInstance m_instance = VK_NULL_HANDLE;
    VkSurfaceKHR m_surface = VK_NULL_HANDLE;
    VkPhysicalDevice m_phys = VK_NULL_HANDLE;
    VkDevice m_device = VK_NULL_HANDLE;
    VkQueue m_queue = VK_NULL_HANDLE;
    VkSwapchainKHR m_swapchain = VK_NULL_HANDLE;
    VkExtent2D m_extent{1920, 1080};
    std::vector<VkImage> m_swapImages;
    VkCommandPool m_cmdPool = VK_NULL_HANDLE;
    VkCommandBuffer m_cmdBuf = VK_NULL_HANDLE;
    VkSemaphore m_imageAvail = VK_NULL_HANDLE;
    VkSemaphore m_renderDone = VK_NULL_HANDLE;
    VkFence m_inFlight = VK_NULL_HANDLE;
    bool m_hdrEnabled = false;
    uint64_t m_frame = 0;
};

// ============================================================================
//  GAME — ties ECS, streaming terrain, Vulkan renderer, and touch input
// ============================================================================
class Game {
public:
    void onWindowReady(ANativeWindow* win) {
        if (!m_renderer.init(win)) {
            LOGE("Failed to initialize Vulkan renderer");
            return;
        }
        m_player.init(m_world);
        m_terrain = std::make_unique<TerrainStreamer>(m_world);
        m_initialized = true;
        m_lastTime = clock::now();
        LOGI("Game world initialized (offline single-player mode)");
    }

    void connectToServer(const std::string& host, int port) {
        m_net.connect(host, port);
    }

    void onWindowDestroyed() {
        if (!m_initialized) return;
        m_net.disconnect();
        m_renderer.shutdown();
        m_initialized = false;
    }

    int32_t onMotionEvent(AInputEvent* ev) {
        int32_t action = AMotionEvent_getAction(ev);
        int32_t masked = action & AMOTION_EVENT_ACTION_MASK;
        int32_t idx = (action & AMOTION_EVENT_ACTION_POINTER_INDEX_MASK) >> AMOTION_EVENT_ACTION_POINTER_INDEX_SHIFT;
        int32_t id = AMotionEvent_getPointerId(ev, idx);
        float w = static_cast<float>(m_renderer.width());
        float h = static_cast<float>(m_renderer.height());

        if (masked == AMOTION_EVENT_ACTION_DOWN || masked == AMOTION_EVENT_ACTION_POINTER_DOWN) {
            float x = AMotionEvent_getX(ev, idx);
            float y = AMotionEvent_getY(ev, idx);
            if (x < w * 0.5f && m_joyPointer < 0) {
                m_joyPointer = id;
                m_joyOriginX = x;
                m_joyOriginY = y;
            } else if (x >= w * 0.5f) {
                if (y > h * 0.7f) {
                    int skillIdx = x < w * 0.67f ? 0 : (x < w * 0.84f ? 1 : 2);
                    m_pendingSkill = skillIdx;
                } else if (m_lookPointer < 0) {
                    m_lookPointer = id;
                    m_lastLookX = x;
                }
            }
            return 1;
        }
        if (masked == AMOTION_EVENT_ACTION_UP || masked == AMOTION_EVENT_ACTION_POINTER_UP || masked == AMOTION_EVENT_ACTION_CANCEL) {
            if (id == m_joyPointer) {
                m_joyPointer = -1;
                m_moveInput = {0, 0, 0};
            } else if (id == m_lookPointer) {
                m_lookPointer = -1;
            }
            return 1;
        }
        if (masked == AMOTION_EVENT_ACTION_MOVE) {
            size_t count = AMotionEvent_getPointerCount(ev);
            for (size_t i = 0; i < count; ++i) {
                int32_t pid = AMotionEvent_getPointerId(ev, i);
                float x = AMotionEvent_getX(ev, i);
                float y = AMotionEvent_getY(ev, i);
                if (pid == m_joyPointer) {
                    float dx = std::clamp((x - m_joyOriginX) / 140.f, -1.f, 1.f);
                    float dy = std::clamp((y - m_joyOriginY) / 140.f, -1.f, 1.f);
                    m_moveInput = {dx, 0.f, -dy};
                } else if (pid == m_lookPointer) {
                    m_camYaw -= (x - m_lastLookX) * 0.004f;
                    m_lastLookX = x;
                }
            }
            return 1;
        }
        return 0;
    }

    void tick() {
        if (!m_initialized) return;
        auto now = clock::now();
        float dt = std::chrono::duration<float>(now - m_lastTime).count();
        m_lastTime = now;
        dt = std::min(dt, 0.1f);

        if (m_moveInput.length() > 0.05f) {
            float cs = std::cos(m_camYaw);
            float sn = std::sin(m_camYaw);
            Vec3 worldDir{
                m_moveInput.x * cs + m_moveInput.z * sn,
                0.f,
                -m_moveInput.x * sn + m_moveInput.z * cs
            };
            m_player.move(m_world, worldDir, 5.5f, dt);
        }

        if (m_pendingSkill >= 0) {
            m_player.useSkill(m_world, m_pendingSkill);
            m_pendingSkill = -1;
        }

        Vec3 ppos = m_world.transform(m_player.entity).position;
        m_terrain->update(ppos);

        m_movement.update(m_world, *m_terrain, dt);
        m_ai.update(m_world, m_player.entity, dt);
        m_player.updateCooldowns(dt);

        if (m_net.connected) {
            NetPacket move{NetPacket::PLAYER_MOVE, m_player.entity, ppos, {}};
            m_net.send(move);
            NetPacket in;
            while (m_net.poll(in)) {
                if (in.type == NetPacket::PLAYER_MOVE && in.entity != m_player.entity && m_world.valid(in.entity)) {
                    m_world.transform(in.entity).position = in.position;
                }
            }
        }

        Vec3 eye = ppos + Vec3{-std::sin(m_camYaw) * 12.f, 8.f, -std::cos(m_camYaw) * 12.f};
        float aspect = static_cast<float>(m_renderer.width()) / static_cast<float>(m_renderer.height());
        Mat4 view = Mat4::lookAt(eye, ppos, {0, 1, 0});
        Mat4 proj = Mat4::perspective(1.05f, aspect, 0.1f, 1000.f);
        m_renderer.drawFrame(m_world, view, proj);

        if (++m_frames % 120 == 0) {
            LOGI("Pos(%.1f,%.1f,%.1f) Lv%d HP%.0f Gold%d",
                 ppos.x, ppos.y, ppos.z, m_player.level,
                 m_world.health(m_player.entity).current, m_player.gold);
        }
    }

private:
    using clock = std::chrono::steady_clock;
    bool m_initialized = false;
    clock::time_point m_lastTime;
    uint64_t m_frames = 0;

    int32_t m_joyPointer = -1;
    int32_t m_lookPointer = -1;
    float m_joyOriginX = 0.f, m_joyOriginY = 0.f;
    float m_lastLookX = 0.f;
    float m_camYaw = 0.f;
    int m_pendingSkill = -1;
    Vec3 m_moveInput{0, 0, 0};

    World m_world;
    Player m_player;
    std::unique_ptr<TerrainStreamer> m_terrain;
    Renderer m_renderer;
    NetworkClient m_net;
    MovementSystem m_movement;
    AISystem m_ai;
};

// ============================================================================
//  ANDROID ENTRY POINT — native activity glue
// ============================================================================
static Game g_game;

static void handle_cmd(android_app* app, int32_t cmd) {
    switch (cmd) {
    case APP_CMD_INIT_WINDOW:
        if (app->window) g_game.onWindowReady(app->window);
        break;
    case APP_CMD_TERM_WINDOW:
        g_game.onWindowDestroyed();
        break;
    default:
        break;
    }
}

static int32_t handle_input(android_app* app, AInputEvent* ev) {
    (void)app;
    if (AInputEvent_getType(ev) == AINPUT_EVENT_TYPE_MOTION) {
        return g_game.onMotionEvent(ev);
    }
    return 0;
}

void android_main(android_app* app) {
    app->onAppCmd = handle_cmd;
    app->onInputEvent = handle_input;
    LOGI("=== ShadowRealm 3D Vulkan Engine starting ===");

    while (true) {
        int events = 0;
        android_poll_source* src = nullptr;
        while (ALooper_pollAll(0, nullptr, &events, reinterpret_cast<void**>(&src)) >= 0) {
            if (src) src->process(app, src);
            if (app->destroyRequested) {
                g_game.onWindowDestroyed();
                LOGI("=== Engine shutdown ===");
                return;
            }
        }
        g_game.tick();
    }
}