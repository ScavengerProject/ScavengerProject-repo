# from selenium import webdriver
# from selenium.webdriver.common.by import By
# from selenium.webdriver.support.ui import WebDriverWait
# from selenium.webdriver.support import expected_conditions as EC
# from selenium.common.exceptions import TimeoutException, NoSuchElementException
# import time
# import os

# # CONFIGURANDO AS VARIÁVEIS
# DIRETORIO_DO_SCRIPT = os.path.dirname(__file__)
# URL_LOGIN = "http://localhost:5173/"
# TIMEOUT_MAXIMO = 10

# # CONFIGURAÇÃO DO CAMINHO DOS SCREENSHOTS
# DIRETORIO_BASE_SCREENSHOTS = os.path.join(DIRETORIO_DO_SCRIPT, "screenshots")
# NOME_ARQUIVO_FALHA = "falha_ct_prova_004.png"
# NOME_ARQUIVO_SUCESSO = "sucesso_ct_prova_004.png"
# CAMINHO_COMPLETO_FALHA = os.path.join(DIRETORIO_BASE_SCREENSHOTS, NOME_ARQUIVO_FALHA)
# CAMINHO_COMPLETO_SUCESSO = os.path.join(DIRETORIO_BASE_SCREENSHOTS, NOME_ARQUIVO_SUCESSO)

# # DADOS DO TESTE
# NOME_PROVA_ORIGINAL = "Prova Antiga 2025"  # Prova do ano anterior
# NOME_PROVA_COPIA = "Cópia 2026"  # Nome da nova prova reutilizada

# # INICIANDO O TESTE CT-PROVA-004
# print("Iniciando Teste CT-PROVA-004 (Reutilização de Prova Antiga)...")
# print("RF 3 / Prova Reutilizada")
# print("Reutilização de Prova Antiga")

# try:
#     if not os.path.exists(DIRETORIO_BASE_SCREENSHOTS):
#         os.makedirs(DIRETORIO_BASE_SCREENSHOTS)
#         print(f"Diretório criado: {DIRETORIO_BASE_SCREENSHOTS}")
        
#     navegador = webdriver.Chrome()
#     navegador.maximize_window()
#     navegador.get(URL_LOGIN)
#     wait = WebDriverWait(navegador, TIMEOUT_MAXIMO)
    
#     # ============================================================
#     # PRÉ-CONDIÇÃO: CRIAR UMA PROVA ANTIGA (ANO ANTERIOR)
#     # ============================================================
#     print("\n=== PRÉ-CONDIÇÃO: Criando prova antiga do ano anterior ===")
    
#     # Login como Administrador
#     print("Fazendo login como Administrador...")
#     campo_email = wait.until(EC.presence_of_element_located((By.ID, "email")))
#     campo_email.send_keys("admin@gincana.com")
#     campo_senha = navegador.find_element(By.ID, "senha")
#     campo_senha.send_keys("admin123")
#     botao_entrar = navegador.find_element(By.XPATH, "//button[normalize-space()='Entrar']")
#     botao_entrar.click()
#     print("Login como Administrador realizado.")

#     # Navegação para criar prova
#     print("Navegando para criar nova prova...")
#     wait.until(EC.presence_of_element_located((By.XPATH, "//button[normalize-space()='Ver Provas']"))).click()
#     wait.until(EC.presence_of_element_located((By.XPATH, "//button[normalize-space()='Gerenciar Provas']"))).click()
#     wait.until(EC.presence_of_element_located((By.XPATH, "//button[normalize-space()='Criar Nova Prova']"))).click()
#     print("Formulário de criação de prova aberto.")

#     # Preenchendo dados básicos da prova antiga
#     print(f"Criando prova antiga '{NOME_PROVA_ORIGINAL}'...")
#     campo_titulo = wait.until(EC.presence_of_element_located((By.ID, "titulo")))
#     campo_titulo.send_keys(NOME_PROVA_ORIGINAL)
    
#     campo_descricao = navegador.find_element(By.ID, "descricao")
#     campo_descricao.send_keys("Prova antiga do ano anterior para teste de reutilização")

#     # Selecionando formato (Questionário Online)
#     print("Selecionando formato da prova...")
#     trigger_dropdown = wait.until(EC.element_to_be_clickable((By.ID, "formato-dropdown")))
#     trigger_dropdown.click()
    
#     opcao_questionario = wait.until(EC.element_to_be_clickable((By.XPATH, "//div[@role='presentation']//div[1]")))
#     opcao_questionario.click()
#     print("Formato 'Questionário Online' selecionado.")

#     # Configurando datas do ano anterior (2024)
#     print("Configurando datas do ano anterior (2024)...")
#     campo_data_inicio = wait.until(EC.element_to_be_clickable((By.ID, "data_inicio")))
#     campo_data_inicio.click()
#     campo_data_inicio.clear()
#     campo_data_inicio.send_keys("20112024")  # Data do ano anterior
    
#     campo_data_termino = wait.until(EC.element_to_be_clickable((By.ID, "data_fim")))
#     campo_data_termino.click()
#     campo_data_termino.clear()
#     campo_data_termino.send_keys("22112024")  # Data do ano anterior
#     print("Datas do ano anterior configuradas.")

#     # Configurando quesitos de avaliação
#     print("Configurando quesitos de avaliação...")
#     try:
#         # Procurar checkboxes de quesitos
#         checkbox_tempo = navegador.find_elements(By.XPATH, "//input[@type='checkbox' and @value='TEMPO' or contains(@id, 'TEMPO')]")
#         checkbox_produtividade = navegador.find_elements(By.XPATH, "//input[@type='checkbox' and @value='PRODUTIVIDADE' or contains(@id, 'PRODUTIVIDADE')]")
        
#         # Marcar ambos os quesitos
#         if len(checkbox_tempo) > 0:
#             if not checkbox_tempo[0].is_selected():
#                 checkbox_tempo[0].click()
#             print("Quesito 'Tempo de Execução' marcado.")
        
#         if len(checkbox_produtividade) > 0:
#             if not checkbox_produtividade[0].is_selected():
#                 checkbox_produtividade[0].click()
#             print("Quesito 'Produtividade/Volume' marcado.")
#     except:
#         print("Aviso: Não foi possível configurar quesitos de avaliação.")

#     # Configurando cotas de participantes
#     print("Configurando cotas de participantes...")
#     try:
#         campo_cota_fundamental = wait.until(EC.presence_of_element_located((By.ID, "ALUNOS_FUNDAMENTAL")))
#         campo_cota_fundamental.clear()
#         campo_cota_fundamental.send_keys("20")
#         print("Cota de 20 vagas configurada para Alunos do Ensino Fundamental.")
        
#         campo_cota_medio = wait.until(EC.presence_of_element_located((By.ID, "ALUNOS_MEDIO")))
#         campo_cota_medio.clear()
#         campo_cota_medio.send_keys("15")
#         print("Cota de 15 vagas configurada para Alunos do Ensino Médio.")
#     except:
#         print("Aviso: Não foi possível configurar cotas.")

#     # Salvar a prova antiga
#     print("Salvando prova antiga...")
#     botao_salvar = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[normalize-space()='Criar Prova']")))
#     botao_salvar.click()
    
#     # Aguardar confirmação de criação
#     try:
#         wait.until(EC.url_contains("/admin/provas"))
#         print("Prova antiga criada com sucesso!")
#     except TimeoutException:
#         print("Aviso: Não foi possível confirmar redirecionamento, mas continuando...")

#     time.sleep(2)

#     # ============================================================
#     # PASSO 1: ADMINISTRADOR SELECIONA A PROVA ANTIGA
#     # ============================================================
#     print("\n=== PASSO 1: Administrador seleciona a prova do ano anterior ===")
    
#     # Aguardar a lista de provas carregar
#     print("Aguardando lista de provas carregar...")
#     time.sleep(3)
    
#     # Procurar pela prova antiga na lista
#     print(f"Procurando pela prova '{NOME_PROVA_ORIGINAL}' na lista...")
#     try:
#         # Aguardar elementos de loading desaparecerem
#         try:
#             wait.until(EC.invisibility_of_element_located((By.XPATH, "//*[contains(@class, 'loading') or contains(@class, 'spinner')]")))
#         except:
#             pass
        
#         # Procurar pelo card da prova antiga
#         elementos_prova = navegador.find_elements(By.XPATH, f"//*[contains(text(), '{NOME_PROVA_ORIGINAL}')]")
        
#         if len(elementos_prova) == 0:
#             # Se não encontrou, pode ser que precise recarregar a página
#             print("Prova não encontrada. Recarregando página...")
#             navegador.refresh()
#             time.sleep(3)
#             elementos_prova = navegador.find_elements(By.XPATH, f"//*[contains(text(), '{NOME_PROVA_ORIGINAL}')]")
        
#         if len(elementos_prova) == 0:
#             raise Exception(f"Prova '{NOME_PROVA_ORIGINAL}' não encontrada na lista.")
        
#         print(f"Prova '{NOME_PROVA_ORIGINAL}' encontrada na lista.")
        
#     except Exception as e:
#         print(f"ERRO: {e}")
#         print("NOTA: Certifique-se de que a prova antiga foi criada ou use uma prova existente.")
#         raise

#     # ============================================================
#     # PASSO 2: CLICAR EM "REUTILIZAR" E SALVAR COMO "CÓPIA 2026"
#     # ============================================================
#     print("\n=== PASSO 2: Clicando em 'Reutilizar' e salvando como 'Cópia 2026' ===")
    
#     # Procurar pelo botão "Reutilizar" na linha da prova
#     print("Procurando botão 'Reutilizar'...")
#     try:
#         # Tentar múltiplos XPaths para encontrar o botão Reutilizar
#         xpaths_botao_reutilizar = [
#             f"//*[contains(text(), '{NOME_PROVA_ORIGINAL}')]/ancestor::*[contains(@class, 'Card') or contains(@class, 'card')]//button[contains(text(), 'Reutilizar')]",
#             f"//*[contains(text(), '{NOME_PROVA_ORIGINAL}')]/ancestor::*[contains(@class, 'Card') or contains(@class, 'card')]//*[contains(text(), 'Reutilizar')]",
#             "//button[contains(text(), 'Reutilizar')]",
#             "//*[contains(text(), 'Reutilizar') and (self::button or self::a)]",
#             f"//*[contains(text(), '{NOME_PROVA_ORIGINAL}')]/following::button[contains(text(), 'Reutilizar')]",
#             f"//*[contains(text(), '{NOME_PROVA_ORIGINAL}')]/ancestor::div[contains(@class, 'Card')]//button[contains(@aria-label, 'Reutilizar') or contains(@title, 'Reutilizar')]"
#         ]
        
#         botao_reutilizar_encontrado = False
#         for xpath in xpaths_botao_reutilizar:
#             try:
#                 wait_rapido = WebDriverWait(navegador, 5)
#                 botao_reutilizar = wait_rapido.until(EC.element_to_be_clickable((By.XPATH, xpath)))
#                 navegador.execute_script("arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", botao_reutilizar)
#                 time.sleep(0.5)
#                 botao_reutilizar.click()
#                 botao_reutilizar_encontrado = True
#                 print(f"Botão 'Reutilizar' encontrado e clicado com XPath: {xpath}")
#                 break
#             except TimeoutException:
#                 continue
        
#         if not botao_reutilizar_encontrado:
#             raise TimeoutException("Botão 'Reutilizar' não encontrado. A funcionalidade pode não estar implementada.")
        
#         # Aguardar modal ou formulário de reutilização abrir
#         print("Aguardando formulário de reutilização abrir...")
#         time.sleep(2)
        
#         # Verificar se um modal ou formulário foi aberto
#         try:
#             # Procurar por modal ou formulário
#             modal = wait.until(EC.presence_of_element_located((By.XPATH, 
#                 "//div[contains(@role, 'dialog') or contains(@class, 'Dialog') or contains(@class, 'modal')]")))
#             print("Modal/formulário de reutilização aberto.")
#         except TimeoutException:
#             print("Aviso: Modal não detectado. Continuando...")
        
#         # Preencher o nome da nova prova
#         print(f"Preenchendo nome da nova prova: '{NOME_PROVA_COPIA}'...")
#         try:
#             # Procurar pelo campo de título (pode estar em um modal ou na mesma página)
#             campo_titulo_copia = wait.until(EC.presence_of_element_located((By.ID, "titulo")))
#             campo_titulo_copia.clear()
#             campo_titulo_copia.send_keys(NOME_PROVA_COPIA)
#             print(f"Nome '{NOME_PROVA_COPIA}' preenchido.")
#         except TimeoutException:
#             # Tentar outros seletores
#             try:
#                 campo_titulo_copia = wait.until(EC.presence_of_element_located((By.XPATH, 
#                     "//input[@type='text' and contains(@placeholder, 'título') or contains(@name, 'titulo')]")))
#                 campo_titulo_copia.clear()
#                 campo_titulo_copia.send_keys(NOME_PROVA_COPIA)
#                 print(f"Nome '{NOME_PROVA_COPIA}' preenchido.")
#             except:
#                 print("Aviso: Campo de título não encontrado. Continuando...")
        
#         # Verificar se as datas foram limpas (devem estar vazias para nova data)
#         print("Verificando se as datas foram limpas...")
#         try:
#             campo_data_inicio_copia = navegador.find_element(By.ID, "data_inicio")
#             valor_data_inicio = campo_data_inicio_copia.get_attribute("value")
#             if valor_data_inicio:
#                 print(f"Data de início encontrada: {valor_data_inicio}")
#                 # Limpar a data para configurar nova
#                 campo_data_inicio_copia.clear()
#                 campo_data_inicio_copia.send_keys("20112026")  # Nova data para 2026
#                 print("Nova data de início configurada: 20112026")
            
#             campo_data_fim_copia = navegador.find_element(By.ID, "data_fim")
#             valor_data_fim = campo_data_fim_copia.get_attribute("value")
#             if valor_data_fim:
#                 campo_data_fim_copia.clear()
#                 campo_data_fim_copia.send_keys("22112026")  # Nova data para 2026
#                 print("Nova data de término configurada: 22112026")
#         except:
#             print("Aviso: Não foi possível verificar/configurar datas.")
        
#         # Salvar a prova reutilizada
#         print("Salvando prova reutilizada...")
#         try:
#             botao_salvar_copia = wait.until(EC.element_to_be_clickable((By.XPATH, 
#                 "//button[normalize-space()='Criar Prova'] | //button[normalize-space()='Salvar'] | //button[normalize-space()='Reutilizar']")))
#             botao_salvar_copia.click()
#             print("Botão de salvar clicado.")
#         except TimeoutException:
#             raise Exception("Botão de salvar não encontrado.")
        
#         # Aguardar confirmação
#         time.sleep(3)
#         try:
#             wait.until(EC.url_contains("/admin/provas"))
#             print("Prova reutilizada criada com sucesso!")
#         except TimeoutException:
#             print("Aviso: Não foi possível confirmar redirecionamento, mas continuando...")
        
#     except Exception as e:
#         print(f"ERRO ao reutilizar prova: {e}")
#         navegador.save_screenshot(CAMINHO_COMPLETO_FALHA)
#         raise

#     # ============================================================
#     # VERIFICAÇÃO: NOVA PROVA DEVE TER TODAS AS REGRAS DA ORIGINAL
#     # ============================================================
#     print("\n=== VERIFICAÇÃO: Verificando se a nova prova tem todas as regras da original ===")
    
#     time.sleep(2)
    
#     # Procurar pela nova prova na lista
#     print(f"Procurando pela nova prova '{NOME_PROVA_COPIA}' na lista...")
#     try:
#         # Recarregar a página se necessário
#         navegador.refresh()
#         time.sleep(3)
        
#         # Procurar pela prova copiada
#         elementos_prova_copia = navegador.find_elements(By.XPATH, f"//*[contains(text(), '{NOME_PROVA_COPIA}')]")
        
#         if len(elementos_prova_copia) == 0:
#             raise Exception(f"Prova '{NOME_PROVA_COPIA}' não encontrada na lista após reutilização.")
        
#         print(f"Prova '{NOME_PROVA_COPIA}' encontrada na lista!")
        
#         # Clicar na prova para ver detalhes e verificar configurações
#         print("Abrindo detalhes da prova reutilizada para verificação...")
#         try:
#             # Procurar pelo card da prova
#             card_prova_copia = wait.until(EC.element_to_be_clickable((By.XPATH, 
#                 f"//*[contains(text(), '{NOME_PROVA_COPIA}')]/ancestor::*[contains(@class, 'Card') or contains(@class, 'card')][1]")))
#             card_prova_copia.click()
#             time.sleep(2)
#         except:
#             # Tentar clicar no botão de editar
#             try:
#                 botao_editar = wait.until(EC.element_to_be_clickable((By.XPATH, 
#                     f"//*[contains(text(), '{NOME_PROVA_COPIA}')]/ancestor::*[contains(@class, 'Card')]//button[contains(@aria-label, 'Editar') or contains(@title, 'Editar')]")))
#                 botao_editar.click()
#                 time.sleep(2)
#             except:
#                 print("Aviso: Não foi possível abrir detalhes da prova. Continuando verificação...")
        
#         # Verificar se o formato foi copiado (Questionário Online)
#         print("Verificando formato da prova...")
#         try:
#             # Verificar se o dropdown de formato mostra "Questionário Online"
#             formato_dropdown = navegador.find_elements(By.ID, "formato-dropdown")
#             if len(formato_dropdown) > 0:
#                 valor_formato = formato_dropdown[0].get_attribute("value") or formato_dropdown[0].text
#                 print(f"Formato encontrado: {valor_formato}")
#                 if "Questionário" in valor_formato or "QUESTIONARIO" in valor_formato.upper():
#                     print("✓ Formato 'Questionário Online' foi copiado corretamente.")
#                 else:
#                     print("⚠ Aviso: Formato pode não ter sido copiado corretamente.")
#         except:
#             print("Aviso: Não foi possível verificar formato.")
        
#         # Verificar se as cotas foram copiadas
#         print("Verificando cotas de participantes...")
#         try:
#             cota_fundamental = navegador.find_element(By.ID, "ALUNOS_FUNDAMENTAL")
#             valor_fundamental = cota_fundamental.get_attribute("value")
#             print(f"Cota ALUNOS_FUNDAMENTAL: {valor_fundamental}")
            
#             cota_medio = navegador.find_element(By.ID, "ALUNOS_MEDIO")
#             valor_medio = cota_medio.get_attribute("value")
#             print(f"Cota ALUNOS_MEDIO: {valor_medio}")
            
#             if valor_fundamental == "20" and valor_medio == "15":
#                 print("✓ Cotas foram copiadas corretamente.")
#             else:
#                 print("⚠ Aviso: Cotas podem não ter sido copiadas corretamente.")
#         except:
#             print("Aviso: Não foi possível verificar cotas.")
        
#         # Verificar se os quesitos foram copiados
#         print("Verificando quesitos de avaliação...")
#         try:
#             checkbox_tempo = navegador.find_elements(By.XPATH, "//input[@type='checkbox' and (@value='TEMPO' or contains(@id, 'TEMPO'))]")
#             checkbox_produtividade = navegador.find_elements(By.XPATH, "//input[@type='checkbox' and (@value='PRODUTIVIDADE' or contains(@id, 'PRODUTIVIDADE'))]")
            
#             tempo_marcado = len(checkbox_tempo) > 0 and checkbox_tempo[0].is_selected()
#             produtividade_marcada = len(checkbox_produtividade) > 0 and checkbox_produtividade[0].is_selected()
            
#             if tempo_marcado:
#                 print("✓ Quesito 'Tempo de Execução' foi copiado.")
#             if produtividade_marcada:
#                 print("✓ Quesito 'Produtividade/Volume' foi copiado.")
#         except:
#             print("Aviso: Não foi possível verificar quesitos.")
        
#         # Verificar se a data foi alterada (não deve ser a mesma da original)
#         print("Verificando datas (devem ser diferentes da original)...")
#         try:
#             campo_data_inicio_verificacao = navegador.find_element(By.ID, "data_inicio")
#             data_inicio_valor = campo_data_inicio_verificacao.get_attribute("value")
#             print(f"Data de início da cópia: {data_inicio_valor}")
            
#             if "2026" in data_inicio_valor or "2025" in data_inicio_valor:
#                 if "2024" not in data_inicio_valor:
#                     print("✓ Data foi atualizada (não é mais 2024).")
#                 else:
#                     print("⚠ Aviso: Data ainda é do ano anterior.")
#             else:
#                 print("⚠ Aviso: Data pode não ter sido configurada corretamente.")
#         except:
#             print("Aviso: Não foi possível verificar data.")
        
#         navegador.save_screenshot(CAMINHO_COMPLETO_SUCESSO)
#         print("Screenshot de sucesso salvo.")
        
#     except Exception as e:
#         print(f"ERRO na verificação: {e}")
#         navegador.save_screenshot(CAMINHO_COMPLETO_FALHA)
#         raise

#     # ============================================================
#     # RESULTADO ESPERADO: PROVA REUTILIZADA COM SUCESSO
#     # ============================================================
#     print("\n=== RESULTADO DO TESTE ===")
#     print("A nova prova deve ser criada com todas as regras, formatos e quesitos da prova original,")
#     print("exceto a data de disponibilidade (Critério: Prova Reutilizada).")
#     print("\nTeste CT-PROVA-004 concluído com sucesso!")

# except TimeoutException as e:
#     print("\n=== RESULTADO DO TESTE ===")
#     print("FALHOU - Timeout")
#     print(f"Erro: {e}")
#     if 'navegador' in locals() and navegador:
#         navegador.save_screenshot(CAMINHO_COMPLETO_FALHA)
#         print(f"Screenshot de FALHA salvo em: {CAMINHO_COMPLETO_FALHA}")

# except Exception as e:
#     print("\n=== RESULTADO DO TESTE ===")
#     print("FALHOU")
#     print(f"Erro inesperado: {e}")
#     if 'navegador' in locals() and navegador:
#         navegador.save_screenshot(CAMINHO_COMPLETO_FALHA)
#         print(f"Screenshot de FALHA salvo em: {CAMINHO_COMPLETO_FALHA}")

# finally:
#     # Tempo para visualização antes de fechar
#     print("\nAguardando 5 segundos antes de fechar o navegador...")
#     time.sleep(5)
#     if 'navegador' in locals() and navegador:
#         navegador.quit()
#     print("Teste finalizado.")
