// ============================================================================
//  main.cpp  —  Open World MMORPG 3D Engine (Android NDK, Vulkan, HDR10+)
//  Build: NDK r26+, C++20, Vulkan 1.3
// ============================================================================
#include <android/log.h>
#include <android/native_window.h>
#include <android_native_app_glue.h>
#include <vulkan/vulkan.h>

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
        // Simple layered sine "noise" — replace with real Perlin/Simplex
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
//  NETWORK  —  MMO client stub (replace with real TCP/UDP/WebSocket)
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

    void connect(const std::string& host,int port){
        m_host=host; m_port=port;
        // TODO: real socket(). Here we just simulate.
        connected=true;
        m_worker=std::thread([this]{ runLoop(); });
        LOGI("Net connecting to %s:%d",host.c_str(),port);
    }
    void disconnect(){
        connected=false;
        if(m_worker.joinable()) m_worker.join();
    }
    void send(const NetPacket& p){
        std::lock_guard<std::mutex> lk(m_mtx);
        m_outgoing.push(p);
    }
    bool poll(NetPacket& out){
        std::lock_guard<std::mutex> lk(m_mtx);
        if(m_incoming.empty()) return false;
        out=m_incoming.front(); m_incoming.pop(); return true;
    }
    ~NetworkClient(){ disconnect(); }

private:
    void runLoop(){
        while(connected){
            // Simulated server tick: echo outgoing + heartbeat
            {
                std::lock_guard<std::mutex> lk(m_mtx);
                while(!m_outgoing.empty()){
                    NetPacket p=m_outgoing.front(); m_outgoing.pop();
                    m_incoming.push(p); // echo
                }
            }
            std::this_thread::sleep_for(std::chrono::milliseconds(50));
        }
    }
    std::string m_host; int m_port=0;
    std::thread m_worker;
    std::mutex m_mtx;
    std::queue<NetPacket> m_outgoing, m_incoming;
};

// ============================================================================
//  VULKAN RENDERER  —  HDR10+ swapchain setup (core init)
// ============================================================================
class Renderer {
public:
    bool init(ANativeWindow* window){
        m_window=window;
        if(!createInstance()) return false;
        if(!createSurface())  return false;
        if(!pickPhysicalDevice()) return false;
        if(!createDevice())   return false;
        if(!createSwapchainHDR()) return false;
        LOGI("Vulkan + HDR10+ renderer initialized");
        return true;
    }

    void drawFrame(World& w, const Mat4& view, const Mat4& proj){
        // Full implementation: acquire image, record command buffer,
        // bind PBR pipeline, draw all RenderMesh entities, present.
        // Stubbed here for brevity — see Renderer.cpp in full project.
        m_frame++;
    }

    void shutdown(){
        if(m_device) vkDeviceWaitIdle(m_device);
        if(m_swapchain) vkDestroySwapchainKHR(m_device,m_swapchain,nullptr);
        if(m_device)    vkDestroyDevice(m_device,nullptr);
        if(m_surface)   vkDestroySurfaceKHR(m_instance,m_surface,nullptr);
        if(m_instance)  vkDestroyInstance(m_instance,nullptr);
    }

private:
    bool createInstance(){
        VkApplicationInfo app{VK_STRUCTURE_TYPE_APPLICATION_INFO};
        app.pApplicationName="MMORPG";
        app.apiVersion=VK_API_VERSION_1_3;
        const char* exts[]={"VK_KHR_surface","VK_KHR_android_surface",
                            "VK_EXT_swapchain_colorspace"};
        VkInstanceCreateInfo ci{VK_STRUCTURE_TYPE_INSTANCE_CREATE_INFO};
        ci.pApplicationInfo=&app;
        ci.enabledExtensionCount=3; ci.ppEnabledExtensionNames=exts;
        return vkCreateInstance(&ci,nullptr,&m_instance)==VK_SUCCESS;
    }
    bool createSurface(){
        VkAndroidSurfaceCreateInfoKHR ci{VK_STRUCTURE_TYPE_ANDROID_SURFACE_CREATE_INFO_KHR};
        ci.window=m_window;
        return vkCreateAndroidSurfaceKHR(m_instance,&ci,nullptr,&m_surface)==VK_SUCCESS;
    }
    bool pickPhysicalDevice(){
        uint32_t n=0; vkEnumeratePhysicalDevices(m_instance,&n,nullptr);
        if(!n) return false;
        std::vector<VkPhysicalDevice> devs(n);
        vkEnumeratePhysicalDevices(m_instance,&n,devs.data());
        m_phys=devs[0];
        return true;
    }
    bool createDevice(){
        float prio=1.f;
        VkDeviceQueueCreateInfo q{VK_STRUCTURE_TYPE_DEVICE_QUEUE_CREATE_INFO};
        q.queueCount=1; q.pQueuePriorities=&prio; q.queueFamilyIndex=0;
        const char* exts[]={"VK_KHR_swapchain"};
        VkDeviceCreateInfo ci{VK_STRUCTURE_TYPE_DEVICE_CREATE_INFO};
        ci.queueCreateInfoCount=1; ci.pQueueCreateInfos=&q;
        ci.enabledExtensionCount=1; ci.ppEnabledExtensionNames=exts;
        if(vkCreateDevice(m_phys,&ci,nullptr,&m_device)!=VK_SUCCESS) return false;
        vkGetDeviceQueue(m_device,0,0,&m_queue);
        return true;
    }
    bool createSwapchainHDR(){
        // Query for HDR10 color space: VK_COLOR_SPACE_HDR10_ST2084_EXT
        uint32_t fmtN=0;
        vkGetPhysicalDeviceSurfaceFormatsKHR(m_phys,m_surface,&fmtN,nullptr);
        std::vector<VkSurfaceFormatKHR> fmts(fmtN);
        vkGetPhysicalDeviceSurfaceFormatsKHR(m_phys,m_surface,&fmtN,fmts.data());

        VkSurfaceFormatKHR chosen=fmts[0];
        for(auto&f:fmts){
            if(f.colorSpace==VK_COLOR_SPACE_HDR10_ST2084_EXT){
                chosen=f; m_hdrEnabled=true; break;
            }
        }
        LOGI("HDR10+ %s", m_hdrEnabled?"ENABLED":"not available (SDR fallback)");

        VkSurfaceCapabilitiesKHR caps;
        vkGetPhysicalDeviceSurfaceCapabilitiesKHR(m_phys,m_surface,&caps);
        VkSwapchainCreateInfoKHR sc{VK_STRUCTURE_TYPE_SWAPCHAIN_CREATE_INFO_KHR};
        sc.surface=m_surface;
        sc.minImageCount=caps.minImageCount+1;
        sc.imageFormat=chosen.format;
        sc.imageColorSpace=chosen.colorSpace;
        sc.imageExtent=caps.currentExtent;
        sc.imageArrayLayers=1;
        sc.imageUsage=VK_IMAGE_USAGE_COLOR_ATTACHMENT_BIT;
        sc.preTransform=caps.currentTransform;
        sc.compositeAlpha=VK_COMPOSITE_ALPHA_OPAQUE_BIT_KHR;
        sc.presentMode=VK_PRESENT_MODE_FIFO_KHR;
        sc.clipped=VK_TRUE;
        return vkCreateSwapchainKHR(m_device,&sc,nullptr,&m_swapchain)==VK_SUCCESS;
    }

    ANativeWindow* m_window=nullptr;
    VkInstance m_instance=VK_NULL_HANDLE;
    VkSurfaceKHR m_surface=VK_NULL_HANDLE;
    VkPhysicalDevice m_phys=VK_NULL_HANDLE;
    VkDevice m_device=VK_NULL_HANDLE;
    VkQueue m_queue=VK_NULL_HANDLE;
    VkSwapchainKHR m_swapchain=VK_NULL_HANDLE;
    bool m_hdrEnabled=false;
    uint64_t m_frame=0;
};

// ============================================================================
//  GAME  —  ties everything together
// ============================================================================
class Game {
public:
    void onWindowReady(ANativeWindow* win){
        m_renderer.init(win);
        m_player.init(m_world);
        m_terrain = std::make_unique<TerrainStreamer>(m_world);
        m_net.connect("mmo.example.com",7777);
        m_initialized=true;
        m_lastTime=clock::now();
        LOGI("Game world initialized");
    }

    void onWindowDestroyed(){
        if(!m_initialized) return;
        m_net.disconnect();
        m_renderer.shutdown();
        m_initialized=false;
    }

    void tick(){
        if(!m_initialized) return;
        auto now=clock::now();
        float dt=std::chrono::duration<float>(now-m_lastTime).count();
        m_lastTime=now;
        dt=std::min(dt,0.1f); // clamp spikes

        // --- input simulation (replace with touch input) ---
        m_player.move(m_world,{1,0,0.3f},5.f,dt);

        Vec3 ppos=m_world.transform(m_player.entity).position;
        m_terrain->update(ppos);

        m_movement.update(m_world,*m_terrain,dt);
        m_ai.update(m_world,m_player.entity,dt);
        m_player.updateCooldowns(dt);

        // --- networking ---
        NetPacket move{NetPacket::PLAYER_MOVE,m_player.entity,ppos,{}};
        m_net.send(move);
        NetPacket in;
        while(m_net.poll(in)){ /* apply server state */ }

        // --- render ---
        Vec3 eye=ppos+Vec3{0,8,-12};
        Mat4 view=Mat4::lookAt(eye,ppos,{0,1,0});
        Mat4 proj=Mat4::perspective(1.05f,16.f/9.f,0.1f,1000.f);
        m_renderer.drawFrame(m_world,view,proj);

        if(++m_frames%120==0)
            LOGI("Pos(%.1f,%.1f,%.1f) Lv%d HP%.0f Gold%d",
                 ppos.x,ppos.y,ppos.z,m_player.level,
                 m_world.health(m_player.entity).current,m_player.gold);
    }

private:
    using clock=std::chrono::steady_clock;
    bool m_initialized=false;
    clock::time_point m_lastTime;
    uint64_t m_frames=0;

    World m_world;
    Player m_player;
    std::unique_ptr<TerrainStreamer> m_terrain;
    Renderer m_renderer;
    NetworkClient m_net;
    MovementSystem m_movement;
    AISystem m_ai;
};

// ============================================================================
//  ANDROID ENTRY POINT  —  native activity glue
// ============================================================================
static Game g_game;

static void handle_cmd(android_app* app,int32_t cmd){
    switch(cmd){
    case APP_CMD_INIT_WINDOW:
        if(app->window) g_game.onWindowReady(app->window);
        break;
    case APP_CMD_TERM_WINDOW:
        g_game.onWindowDestroyed();
        break;
    default: break;
    }
}

static int32_t handle_input(android_app* app,AInputEvent* ev){
    if(AInputEvent_getType(ev)==AINPUT_EVENT_TYPE_MOTION){
        // TODO: virtual joystick + skill buttons
        return 1;
    }
    return 0;
}

void android_main(android_app* app){
    app->onAppCmd     = handle_cmd;
    app->onInputEvent = handle_input;
    LOGI("=== MMORPG Engine starting ===");

    while(true){
        int events;
        android_poll_source* src;
        while(ALooper_pollAll(0,nullptr,&events,(void**)&src)>=0){
            if(src) src->process(app,src);
            if(app->destroyRequested){
                g_game.onWindowDestroyed();
                LOGI("=== Engine shutdown ===");
                return;
            }
        }
        g_game.tick();
    }
}