package com.desenho.resource;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import java.lang.management.ManagementFactory;
import java.lang.management.MemoryMXBean;
import java.lang.management.MemoryUsage;
import java.lang.management.RuntimeMXBean;
import java.lang.management.ThreadMXBean;
import java.util.HashMap;
import java.util.Map;

@Path("/monitoring")
public class MonitoringResource {

    @GET
    @Path("/memory")
    @Produces(MediaType.APPLICATION_JSON)
    public Map<String, Object> getMemoryInfo() {
        Map<String, Object> memoryInfo = new HashMap<>();
        
        // Informações da Aplicação (compatível com Native)
        Runtime runtime = Runtime.getRuntime();
        long totalMemory = runtime.totalMemory();
        long freeMemory = runtime.freeMemory();
        long usedMemory = totalMemory - freeMemory;
        long maxMemory = runtime.maxMemory();
        
        Map<String, Object> applicationMemory = new HashMap<>();
        applicationMemory.put("used_mb", usedMemory / (1024 * 1024));
        applicationMemory.put("free_mb", freeMemory / (1024 * 1024));
        applicationMemory.put("total_mb", totalMemory / (1024 * 1024));
        applicationMemory.put("max_mb", maxMemory / (1024 * 1024));
        applicationMemory.put("usage_percentage", (double) usedMemory / maxMemory * 100);
        
        // Tentar usar MemoryMXBean (pode funcionar em Native)
        try {
            MemoryMXBean memoryBean = ManagementFactory.getMemoryMXBean();
            MemoryUsage heapMemory = memoryBean.getHeapMemoryUsage();
            
            Map<String, Object> heapInfo = new HashMap<>();
            heapInfo.put("heap_used_mb", heapMemory.getUsed() / (1024 * 1024));
            heapInfo.put("heap_max_mb", heapMemory.getMax() / (1024 * 1024));
            heapInfo.put("heap_committed_mb", heapMemory.getCommitted() / (1024 * 1024));
            heapInfo.put("heap_usage_percentage", (double) heapMemory.getUsed() / heapMemory.getMax() * 100);
            
            applicationMemory.put("detailed_heap", heapInfo);
        } catch (Exception e) {
            applicationMemory.put("detailed_heap", "Not available in Native mode");
        }
        
        // Informações do sistema (básicas)
        Map<String, Object> systemInfo = new HashMap<>();
        systemInfo.put("available_processors", Runtime.getRuntime().availableProcessors());
        
        // Informações estimadas do container/sistema
        // Em Native, usamos heurísticas
        long estimatedSystemMemory = maxMemory * 2; // Estimativa conservadora
        systemInfo.put("estimated_system_memory_mb", estimatedSystemMemory / (1024 * 1024));
        systemInfo.put("application_vs_system_percentage", (double) usedMemory / estimatedSystemMemory * 100);
        
        memoryInfo.put("application_memory", applicationMemory);
        memoryInfo.put("system_info", systemInfo);
        memoryInfo.put("native_mode", isNativeMode());
        memoryInfo.put("timestamp", System.currentTimeMillis());
        
        return memoryInfo;
    }
    
    @GET
    @Path("/health")
    @Produces(MediaType.APPLICATION_JSON)
    public Map<String, Object> getHealthInfo() {
        Map<String, Object> healthInfo = new HashMap<>();
        
        Runtime runtime = Runtime.getRuntime();
        long usedMemory = runtime.totalMemory() - runtime.freeMemory();
        long maxMemory = runtime.maxMemory();
        double memoryUsagePercentage = (double) usedMemory / maxMemory * 100;
        
        healthInfo.put("status", memoryUsagePercentage > 90 ? "WARNING" : "HEALTHY");
        healthInfo.put("memory_usage_percentage", memoryUsagePercentage);
        healthInfo.put("native_mode", isNativeMode());
        
        // Tentar obter informações de runtime
        try {
            RuntimeMXBean runtimeBean = ManagementFactory.getRuntimeMXBean();
            healthInfo.put("uptime_ms", runtimeBean.getUptime());
            healthInfo.put("uptime_seconds", runtimeBean.getUptime() / 1000);
        } catch (Exception e) {
            healthInfo.put("uptime_info", "Not available in Native mode");
        }
        
        // Tentar obter informações de threads
        try {
            ThreadMXBean threadBean = ManagementFactory.getThreadMXBean();
            healthInfo.put("thread_count", threadBean.getThreadCount());
            healthInfo.put("peak_thread_count", threadBean.getPeakThreadCount());
        } catch (Exception e) {
            healthInfo.put("thread_info", "Not available in Native mode");
        }
        
        return healthInfo;
    }
    
    @GET
    @Path("/summary")
    @Produces(MediaType.APPLICATION_JSON)
    public Map<String, Object> getMemorySummary() {
        Map<String, Object> summary = new HashMap<>();
        
        Runtime runtime = Runtime.getRuntime();
        long usedMemory = runtime.totalMemory() - runtime.freeMemory();
        long maxMemory = runtime.maxMemory();
        
        // Informações da aplicação
        summary.put("app_memory_used_mb", usedMemory / (1024 * 1024));
        summary.put("app_memory_max_mb", maxMemory / (1024 * 1024));
        summary.put("app_memory_usage_percentage", (double) usedMemory / maxMemory * 100);
        
        // Estimativas para container/pod
        long estimatedPodMemory = maxMemory * 2; // Estimativa: pod tem 2x a memória max da JVM
        summary.put("estimated_pod_memory_mb", estimatedPodMemory / (1024 * 1024));
        summary.put("app_vs_pod_percentage", (double) usedMemory / estimatedPodMemory * 100);
        
        summary.put("processors", runtime.availableProcessors());
        summary.put("native_mode", isNativeMode());
        
        // Tentar obter uptime
        try {
            RuntimeMXBean runtimeBean = ManagementFactory.getRuntimeMXBean();
            summary.put("uptime_seconds", runtimeBean.getUptime() / 1000);
        } catch (Exception e) {
            summary.put("uptime_seconds", "N/A");
        }
        
        return summary;
    }
    
    @GET
    @Path("/native-optimized")
    @Produces(MediaType.APPLICATION_JSON)
    public Map<String, Object> getNativeOptimizedInfo() {
        Map<String, Object> info = new HashMap<>();
        
        Runtime runtime = Runtime.getRuntime();
        
        // Informações básicas sempre disponíveis
        long totalMemory = runtime.totalMemory();
        long freeMemory = runtime.freeMemory();
        long usedMemory = totalMemory - freeMemory;
        long maxMemory = runtime.maxMemory();
        
        info.put("memory_used_mb", usedMemory / (1024 * 1024));
        info.put("memory_free_mb", freeMemory / (1024 * 1024));
        info.put("memory_total_mb", totalMemory / (1024 * 1024));
        info.put("memory_max_mb", maxMemory / (1024 * 1024));
        info.put("memory_usage_percentage", (double) usedMemory / maxMemory * 100);
        
        // Informações do sistema
        info.put("processors", runtime.availableProcessors());
        info.put("is_native", isNativeMode());
        
        // Estimativas para ambiente de container
        Map<String, Object> containerEstimates = new HashMap<>();
        containerEstimates.put("estimated_container_memory_mb", (maxMemory * 2) / (1024 * 1024));
        containerEstimates.put("app_memory_efficiency", (double) usedMemory / (maxMemory * 2) * 100);
        
        info.put("container_estimates", containerEstimates);
        info.put("timestamp", System.currentTimeMillis());
        
        return info;
    }
    
    private boolean isNativeMode() {
        // Verifica se estamos rodando em modo nativo
        return System.getProperty("org.graalvm.nativeimage.imagecode") != null;
    }
}
