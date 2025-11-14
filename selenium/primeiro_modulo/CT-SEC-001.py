from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

# CONFIGURANDO AS VARIÁVEIS
URL_LOGIN = "http://localhost:5173/"
URL_PAINEL_ADMIN_ESPERADA = "http://localhost:5173/"  # Depois do login
TIMEOUT_MAXIMO = 10  # Tempo máximo de espera para elementos (em segundos)
TEMPO_LIMITE_RESPOSTA = 3 # Critério de aceitação (3 segundos)

# INICIANDO O TESTE CT-SEC-001
print("Iniciando Teste CT-SEC-001...")
try:
    # Configura o navegador como o Chrome
    navegador = webdriver.Chrome()
    navegador.maximize_window()
    print(f"Acessando URL: {URL_LOGIN}")
    
    # Inicia a contagem de tempo para medir o tempo de resposta
    start_time = time.time()
    navegador.get(URL_LOGIN)


    # LOGIN
    # Usando espera explícita para garantir que os elementos estejam carregados
    wait = WebDriverWait(navegador, TIMEOUT_MAXIMO)
    
    # Achar e escrever no campo do email
    campo_email = wait.until(EC.presence_of_element_located((By.ID, "email"))).send_keys("admin@gincana.com")

    # Achar e escrever no campo da senha
    campo_senha = navegador.find_element(By.ID, "senha").send_keys("admin123")

    # Clico no botão "Entrar"
    botao_entrar = navegador.find_element(By.XPATH, "//button[normalize-space()='Entrar']").click()
    
    print("Credenciais enviadas")
    

    # VERIFICAÇÕES (CRITÉRIOS DE ACEITAÇÃO)
    
    # PRIMEIRO: VERIFICAÇÃO DE REDIRECIONAMENTO (Painel do Administrador), aconteceu de ser a mesma do login...
    wait.until(EC.url_contains(URL_PAINEL_ADMIN_ESPERADA))
    
    # Mede o Tempo de Resposta Total (do clique no 'Entrar' até o redirecionamento)
    end_time = time.time()
    tempo_resposta = end_time - start_time
    
    # SEGUNDO: VERIFICAÇÃO DO POP-UP DE SUCESSO, estou colocando sempre para esperar pelo elemento dentro do limite (10 segundos)
    pop_up_sucesso = wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, ".flex.items-start.gap-3.px-4.pt-4.pb-3"))) # Colocando o css que é mais preciso, o xpath pode mudar nesse caso

    
    # RESULTADOS
    print("\n RESULTADO DO TESTE")
    
    # Confirmação do Redirecionamento e Pop-up
    print("✅ SUCESSO")
    print(f"Critério 1 (Redirecionamento): URL atual é '{navegador.current_url}' (OK)")
    print(f"Critério 2 (Pop-up Sucesso): Pop-up visível (OK)")

    
    # VERIFICAÇÃO DO TEMPO DE RESPOSTA (Critério RNF 3)
    print(f"Tempo de Resposta Total: {tempo_resposta:.2f} segundos")
    
    if tempo_resposta <= TEMPO_LIMITE_RESPOSTA:
        print(f"Critério 3 (Tempo de Resposta ≤ {TEMPO_LIMITE_RESPOSTA}s): ✅ APROVADO")
    else:
        print(f"Critério 3 (Tempo de Resposta ≤ {TEMPO_LIMITE_RESPOSTA}s): ❌ FALHOU. Tempo excedido.")

    
except Exception as e:
    print("\n RESULTADO DO TESTE")
    print(f"❌ FALHOU")
    print(f"Erro durante a execução do teste: {e}")

    # Vai tirar um screenshot da tela, esperando que pegue a falha
    navegador.save_screenshot("falha_ct_sec_001.png")
    print("Screenshot salvo como falha_ct_sec_001.png")

finally:
    # Do o tempo para a tela ficar aberta e depois fechar
    time.sleep(3)
    if 'navegador' in locals() and navegador:
        navegador.quit()
    print("Teste finalizado.")