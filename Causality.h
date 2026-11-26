#pragma once

#include <algorithm>
#include <functional>
#include <string>
#include <vector>

namespace causality {

enum class LogicOp {
    AND,
    OR
};

template <typename Context>
using CauseFn = std::function<bool(const Context&)>;

template <typename Context>
using EffectFn = std::function<void(Context&)>;

template <typename Context>
inline CauseFn<Context> NOT(CauseFn<Context> predicate) {
    return [pred = std::move(predicate)](const Context& ctx) -> bool {
        return !pred(ctx);
    };
}

template <typename Context>
struct Rule {
    std::string id;
    std::string description;
    LogicOp logic = LogicOp::AND;
    int priority = 0;
    std::vector<CauseFn<Context>> causes;
    EffectFn<Context> effect;
    int maxFires = 0; // 0 = unlimited
    float cooldown = 0.0f;

    // Live runtime telemetry
    int fireCount = 0;
    float cooldownRemaining = 0.0f;
    bool lastConditionMet = false;
};

template <typename Context>
class Engine {
public:
    void addRule(Rule<Context> rule) {
        m_rules.push_back(std::move(rule));
        std::stable_sort(m_rules.begin(), m_rules.end(),
            [](const Rule<Context>& a, const Rule<Context>& b) {
                return a.priority > b.priority;
            });
    }

    void reset() {
        for (auto& rule : m_rules) {
            rule.fireCount = 0;
            rule.cooldownRemaining = 0.0f;
            rule.lastConditionMet = false;
        }
    }

    std::vector<std::string> evaluate(Context& ctx, float dt) {
        std::vector<std::string> fired;
        for (auto& rule : m_rules) {
            if (rule.cooldownRemaining > 0.0f) {
                rule.cooldownRemaining = std::max(0.0f, rule.cooldownRemaining - dt);
            }

            bool conditionMet = false;
            if (!rule.causes.empty()) {
                if (rule.logic == LogicOp::AND) {
                    conditionMet = true;
                    for (const auto& cause : rule.causes) {
                        if (!cause(ctx)) {
                            conditionMet = false;
                            break;
                        }
                    }
                } else {
                    conditionMet = false;
                    for (const auto& cause : rule.causes) {
                        if (cause(ctx)) {
                            conditionMet = true;
                            break;
                        }
                    }
                }
            }

            rule.lastConditionMet = conditionMet;
            if (!conditionMet) continue;
            if (rule.maxFires > 0 && rule.fireCount >= rule.maxFires) continue;
            if (rule.cooldownRemaining > 0.0f) continue;

            rule.fireCount += 1;
            rule.cooldownRemaining = rule.cooldown;
            if (rule.effect) {
                rule.effect(ctx);
            }
            fired.push_back(rule.id);
        }
        return fired;
    }

    const std::vector<Rule<Context>>& rules() const { return m_rules; }

private:
    std::vector<Rule<Context>> m_rules;
};

} // namespace causality
